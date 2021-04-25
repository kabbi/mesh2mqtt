const fs = require('fs');
const debug = require('debug')('app');
const mqtt = require('@kabbi/routed-mqtt');
require('dotenv').config();

const devices = require('./devices.json');

const client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost');
const prefix = process.env.HASS_MQTT_PREFIX || 'mesh2hass';
const meshPrefix = process.env.MESH_MQTT_PREFIX || 'mesh2mqtt';

const transactionsSeen = new Set();
const transactionsSent = new Map();

let hsv2hsl = (h, s, v, l = v - (v * s) / 2, m = Math.min(l, 1 - l)) => [
  h,
  m ? (v - l) / m : 0,
  l,
];

const deviceHandlers = {
  'onoff-client-button': async (config) => {
    const { addr } = config;

    await client.publish(
      `homeassistant/device_automation/${addr}/action_short_press/config`,
      JSON.stringify({
        automation_type: 'trigger',
        device: {
          identifiers: [`blemesh_${addr}`],
          name: addr,
        },
        payload: 'button_short_press',
        subtype: 'button_1',
        topic: `${prefix}/${addr}/action`,
        type: 'action',
      }),
    );

    await client.handle(
      `${meshPrefix}/${addr}/models/generic-onoff/set-unack`,
      (match, payload) => {
        const { status, transactionId } = JSON.parse(payload);
        const transactionKey = `${addr}-${transactionId}`;
        if (transactionsSeen.has(transactionKey)) {
          return;
        }

        transactionsSeen.add(transactionKey);
        client.publish(`${prefix}/${addr}/action`, 'button_short_press');
      },
    );
  },
  switch: async (config) => {
    const { addr, features } = config;

    await client.publish(
      `homeassistant/switch/${addr}/config`,
      JSON.stringify({
        device: {
          identifiers: [`blemesh_${addr}`],
          name: addr,
        },
        command_topic: `${prefix}/${addr}/cmd`,
        state_topic: `${prefix}/${addr}/state`,
        name: `${addr}_switch`,
        unique_id: addr,
      }),
    );

    // Incoming
    await client.handle(`${prefix}/${addr}/cmd`, async (match, payload) => {
      const tid = transactionsSent.get(addr) || 0;
      transactionsSent.set(addr, tid + 1);

      await client.publishJSON(
        `${meshPrefix}/${addr}/models/generic-onoff/set/send`,
        {
          status: payload.toString('utf8').toLowerCase(),
          transactionId: tid,
        },
      );
    });

    // Outgoing
    await client.handleJSON(
      `${meshPrefix}/${addr}/models/generic-onoff/status`,
      async (match, payload) => {
        await client.publish(
          `${prefix}/${addr}/state`,
          `${payload.status}`.toUpperCase(),
        );
      },
    );
  },
  light: async (config) => {
    const { addr, features } = config;

    await client.publish(
      `homeassistant/light/${addr}/light/config`,
      JSON.stringify({
        device: {
          identifiers: [`blemesh_${addr}`],
          name: addr,
        },
        schema: 'json',
        command_topic: `${prefix}/${addr}/cmd`,
        state_topic: `${prefix}/${addr}/state`,
        brightness: features.some((f) => f.type === 'brightness'),
        color_temp: features.some((f) => f.type === 'color-temperature'),
        hs: features.some((f) => f.type === 'hsl'),
        name: `${addr}_light`,
        unique_id: addr,
      }),
    );

    // Incoming
    await client.handleJSON(`${prefix}/${addr}/cmd`, async (match, payload) => {
      const { state, brightness, color, color_temp } = payload;
      const tid = transactionsSent.get(addr) || 0;
      transactionsSent.set(addr, tid + 1);

      await client.publishJSON(
        `${meshPrefix}/${addr}/models/generic-onoff/set/send`,
        {
          status: state.toLowerCase(),
          transactionId: tid,
        },
      );

      if (color != null) {
        const { overrideAddr } = features.find((f) => f.type === 'hsl');
        const target = overrideAddr || addr;

        await client.publishJSON(
          `${meshPrefix}/${target}/models/light-hsl/set/send`,
          {
            hue: (color.h / 360) * 0xffff,
            saturation: (color.s / 100) * 0xffff,
            lightness: 32000,
            transactionId: tid,
          },
        );
      }

      if (brightness != null) {
        const { overrideAddr } = features.find((f) => f.type === 'brightness');
        const target = overrideAddr || addr;
        await client.publishJSON(
          `${meshPrefix}/${target}/models/light-lightness/set/send`,
          {
            lightness: (brightness / 255) * 0xffff,
            transactionId: tid,
          },
        );
      }

      if (color_temp != null) {
        const { overrideAddr } = features.find(
          (f) => f.type === 'color-temperature',
        );
        const target = overrideAddr || addr;
        await client.publishJSON(
          `${meshPrefix}/${target}/models/light-ctl/temp-set/send`,
          {
            temperature: Math.round(1000000 / color_temp), // hass uses mireds
            transactionId: tid,
          },
        );
      }
    });

    // Outgoing
    await client.handleJSON(
      `${meshPrefix}/${addr}/models/generic-onoff/status`,
      async (match, payload) => {
        await client.publishJSON(`${prefix}/${addr}/state`, {
          state: `${payload.status}`.toUpperCase(),
        });
      },
    );
  },
  strip: async (config) => {
    const { addr, features } = config;

    await client.publish(
      `homeassistant/light/${addr}/light/config`,
      JSON.stringify({
        device: {
          identifiers: [`blemesh_${addr}`],
          name: addr,
        },
        schema: 'json',
        command_topic: `${prefix}/${addr}/cmd`,
        brightness: features.some((f) => f.type === 'brightness'),
        brightness_scale: 0xffff,
        name: `${addr}_light`,
        unique_id: addr,
	      optimistic: true,
      	rgb: true,
      }),
    );

    // Incoming
    await client.handleJSON(`${prefix}/${addr}/cmd`, async (match, payload) => {
      const { state, brightness, color } = payload;
      const tid = transactionsSent.get(addr) || 0;
      transactionsSent.set(addr, tid + 1);

      if (state && !color && !brightness) {
        await client.publishJSON(
          `${meshPrefix}/${addr}/models/generic-onoff/set/send`,
          {
            status: state.toLowerCase(),
            transactionId: tid,
          },
        );
      }

      if (color != null) {
        const { overrideAddr } = features.find((f) => f.type === 'rgb');
        const target = overrideAddr || addr;

        await client.publishJSON(
          `${meshPrefix}/${target}/models/kabbi-strip/set-segment/send`,
    	    { from: 0, to: 65535, color },
        );
      }

      if (brightness != null) {
        const { overrideAddr } = features.find((f) => f.type === 'brightness');
        const target = overrideAddr || addr;
        await client.publishJSON(
          `${meshPrefix}/${target}/models/generic-level/set/send`,
          {
            level: brightness - 32768,
            transactionId: tid,
          },
        );
      }
    });
  },
};

client.setMaxListeners(1e3);
client.once('connect', async () => {
  console.log('- setting up devices');

  for (const device of devices) {
    const handler = deviceHandlers[device.type];
    if (!handler) {
      console.error('Unsupported device type', device.type);
      continue;
    }

    console.log(`- [${device.addr}] ${device.type}`);
    handler(device);
  }
});
