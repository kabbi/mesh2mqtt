const fs = require('fs');
const debug = require('debug')('app');
const mqtt = require('@kabbi/routed-mqtt');
require('dotenv').config();

const devices = require('./devices.json');

const client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost');
const devicePrefix = process.env.HASS_MQTT_PREFIX || 'mesh2hass';
const meshPrefix = process.env.MESH_MQTT_PREFIX || 'mesh2mqtt';

const transactionsSeen = new Set();
const transactionsSent = new Map();

client.setMaxListeners(1e3);
client.once('connect', async () => {
  console.log('- setting up devices');

  for (const device of devices) {
    let handler;
    try {
      handler = require(`./devices/${device.type}`);
    } catch (e) {
      console.error('Unsupported device type', device.type);
      continue;
    }

    console.log(`- [${device.addr}] ${device.type}`);
    handler({
      device,
      client,
      state: {
        transactionsSent,
        transactionsSeen,
      },
      config: {
        devicePrefix,
        meshPrefix,
      },
    });
  }
});
