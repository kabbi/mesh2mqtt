const fs = require('fs');
const debug = require('debug')('app');
const {
  NetworkLayer,
  AccessLayer,
  UpperLayer,
  LowerLayer,
  Keychain,
} = require('mesh-first-try');
const { kebabCase } = require('lodash');
const mqtt = require('./mqtt');
require('dotenv').config();

const TypeToTopic = require('./topics');

const client = mqtt.connect(process.env.MQTT_URL || 'localhost');
const prefix = process.env.MESH_MQTT_PREFIX || 'mesh2mqtt';
const ownMeshAddr = 0x7fc;
let bridgeAddr; // FIXME

const keychain = new Keychain();
keychain.load(require('./keychain.json'));

// Setup mesh stuff
const networkLayer = new NetworkLayer(keychain);
const lowerLayer = new LowerLayer(keychain);
const upperLayer = new UpperLayer();
const accessLayer = new AccessLayer();

// Connect all the layers together
networkLayer.on('incoming', (networkMessage) => {
  lowerLayer.handleIncoming(networkMessage);
});
lowerLayer.on('incoming', (lowerTransportMessage) => {
  upperLayer.handleIncoming(lowerTransportMessage);
});
upperLayer.on('incoming', (accessMessage) => {
  accessLayer.handleIncoming(accessMessage);
});
accessLayer.on('outgoing', (accessMessage) => {
  upperLayer.handleOutgoing(accessMessage);
});
upperLayer.on('outgoing', (lowerTransportMessage) => {
  lowerLayer.handleOutgoing(lowerTransportMessage);
});
lowerLayer.on('outgoing', (networkMessage) => {
  networkLayer.handleOutgoing(networkMessage);
});

// Handle all the mqtt topics
client.on('connect', async () => {
  await client.publish(`${prefix}/online`, 'true');

  // Route meshbridge messages from mqtt to mesh stack and back
  await client.handle('meshbridge/:addr/msg', (match, payload) => {
    bridgeAddr = match.params.addr;
    networkLayer.handleIncoming(payload);
  });
  networkLayer.on('outgoing', async (payload) => {
    debug('sending', payload.toString('hex'));
    await client.publish(`meshbridge/${bridgeAddr}/msg/send`, payload);
  });

  // Model behaviour, outgoing
  await client.handle(
    `${prefix}/:addr/models/:model/:op/send`,
    (match, payload) => {
      const { addr, model, op } = match.params;

      const type = Object.keys(TypeToTopic).find((key) => {
        const [modelName, opName] = TypeToTopic[key];
        return modelName === model && opName === op;
      });

      accessLayer.handleOutgoing({
        type,
        appKey: 'mi',
        payload: JSON.parse(payload),
        meta: {
          to: Number.parseInt(addr, 16),
          from: ownMeshAddr,
          ttl: 5,
        },
      });
    },
  );

  // Model behaviour, incoming
  accessLayer.on('incoming', async (msg) => {
    debug('incoming message', msg);
    const addr = msg.meta.from.toString(16).padStart(4, '0');

    await client.publish(`${prefix}/rx`, JSON.stringify(msg));

    const topic = TypeToTopic[msg.type];
    if (topic) {
      await client.publish(
        `${prefix}/${addr}/models/${topic.join('/')}`,
        JSON.stringify(msg.payload),
      );
    }
  });
});
