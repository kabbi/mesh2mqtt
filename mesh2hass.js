const fs = require('fs');
const debug = require('debug')('app');
const mqtt = require('./mqtt');
require('dotenv').config();

const devices = require('./devices');

const client = mqtt.connect(process.env.MQTT_URL || 'localhost');
const prefix = process.env.HASS_MQTT_PREFIX || 'mesh2hass';
const meshPrefix = process.env.MESH_MQTT_PREFIX || 'mesh2mqtt';

const transactionsSeen = new Set();

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
};

client.on('connect', async () => {
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

// accessLayer.on('incoming', (msg) => {
// debug('incoming message', msg);
// const id = msg.meta.from.toString(16).padStart(4, '0');

// if (id === '1006') {
// if (!devicesSeen.has(msg.meta.from)) {
// devicesSeen.add(msg.meta.from);
// client.publish(
// `homeassistant/device_automation/${id}/action_short_press/config`,
// JSON.stringify({
// automation_type: 'trigger',
// device: {
// identifiers: [`blemesh_${id}`],
// name: id,
// },
// payload: 'button_short_press',
// subtype: 'button_1',
// topic: `mesh2mqtt/devices/${id}/action`,
// type: 'action',
// }),
// );
// }
// if (msg.type === 'GenericOnOffSetUnacknowledged') {
// const transactionKey = `${id}:${msg.payload.transactionId}`;
// if (msg.payload.transactionId && transactionsSeen.has(transactionKey)) {
// return;
// }
// client.publish(`${prefix}/devices/${id}/action`, 'button_short_press');
// transactionsSeen.add(transactionKey);
// }
// }

// if (id === '0015') {
// if (!devicesSeen.has(msg.meta.from)) {
// devicesSeen.add(msg.meta.from);
// client.publish(
// `homeassistant/light/${id}/light/config`,
// JSON.stringify({
// device: {
// identifiers: [`blemesh_${id}`],
// name: id,
// },
// schema: 'json',
// command_topic: `mesh2mqtt/devices/${id}/light/set`,
// state_topic: `mesh2mqtt/devices/${id}/light/state`,
// name: `${id}_light`,
// unique_id: id,
// }),
// );
// }
// if (msg.type === 'GenericOnOffStatus') {
// client.publish(
// `${prefix}/devices/${id}/light/status`,
// JSON.stringify({
// state: `${msg.payload.currentStatus}`.toUpperCase(),
// }),
// );
// }
// }
// });
