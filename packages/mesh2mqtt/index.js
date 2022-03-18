const fs = require('fs');
const debug = require('debug')('app');
const {
  NetworkLayer,
  AccessLayer,
  UpperLayer,
  LowerLayer,
  Keychain,
} = require('@kabbi/ble-mesh');
const { kebabCase } = require('lodash');
const mqtt = require('@kabbi/routed-mqtt');
require('dotenv').config();

const TypeToTopic = require('./topics');

const client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost');
const prefix = process.env.MESH_MQTT_PREFIX || 'mesh2mqtt';
const ownMeshAddr = +process.env.MESH_OUTGOING_ADDR || 0x7fc;
let bridgeAddr = process.env.MESH_DEFAULT_BRIDGE_NAME || 'rpi';

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

// Register all custom model handlers
for (const fileName of fs.readdirSync('./models')) {
  try {
    let m = require(`./models/${fileName}`);
    accessLayer.registerModel(m);
  } catch (error) {
    console.error(`Cannot register module ${fileName}`, error);
  }
}

// Handle all the mqtt topics
client.once('connect', async () => {
  await client.publish(`${prefix}/online`, 'true');

  // Route meshbridge messages from mqtt to mesh stack
  await client.handle('meshbridge/:addr/msg', (match, payload) => {
    bridgeAddr = match.params.addr;
    networkLayer.handleIncoming(payload);
  });

  // Route meshbridge messages from mesh stack to mqtt
  networkLayer.on('outgoing', async (payload) => {
    debug('sending', payload.toString('hex'));
    await client.publish(`meshbridge/${bridgeAddr}/msg/send`, payload);
  });

  // Route model access messages from mesh to mqtt
  accessLayer.on('incoming', async (msg) => {
    debug('incoming message', msg);
    const addr = msg.meta.from.toString(16).padStart(4, '0');

    // Raw unprocessed message
    await client.publish(`${prefix}/rx`, JSON.stringify(msg));

    // Fancy topic and only payload
    const topic = TypeToTopic[msg.type];
    if (topic) {
      await client.publish(
        `${prefix}/${addr}/models/${topic.join('/')}`,
        JSON.stringify(msg.payload),
      );
    }
  });

  // Route model access messages from mqtt to mesh
  await client.handleJSON(`${prefix}/tx`, (match, payload) => {
    accessLayer.handleOutgoing(payload);
  });

  // Same as above, but with fancy topic and sane defaults
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
});
