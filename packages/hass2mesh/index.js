const fs = require('fs');
const debug = require('debug')('app');
const mqtt = require('@kabbi/routed-mqtt');
const WebSocket = require('ws');
const {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  callService,
  getStates,
} = require('home-assistant-js-websocket');

require('dotenv').config();

const createSocket = require('./create-socket');

const client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost');
const meshPrefix = process.env.MESH_MQTT_PREFIX || 'mesh2mqtt';
const hassUrl = process.env.HASS_URL || 'http://localhost:8123';
const dbPath = process.env.DB_PATH || './db.json';
const startAddr = process.env.START_ADDR || 0x1000;

const loadDB = () => {
  if (!fs.existsSync(dbPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

const saveDB = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

const start = async (hass) => {
  const db = loadDB();

  const entities = await getStates(hass);

  let lastAddr = Math.max(
    startAddr - 1,
    ...Object.values(db).map((item) => parseInt(item.addr, 16))
  );

  for (const entity of entities) {
    const { entity_id } = entity;

    const [domain] = entity_id.split('.');
    const handlerPath = `./devices/${domain}.js`;

    if (!fs.existsSync(handlerPath)) {
      continue;
    }

    if (!db[entity_id]) {
      db[entity_id] = {
        entity_id,
        addr: (++lastAddr).toString(16).padStart(4, '0'),
      };
    }

    console.log(`- [${db[entity_id].addr}] setting up ${entity_id}`);

    const handler = require(handlerPath);
    handler({
      addr: db[entity_id].addr,
      mqtt: client,
      meshPrefix,
      entity,
      hass,
      db,
    });
  }

  saveDB(db);
};

client.once('connect', async () => {
  const auth = createLongLivedTokenAuth(hassUrl, process.env.HASS_TOKEN);

  const hass = await createConnection({
    createSocket: () => createSocket(auth),
    auth,
  });

  start(hass);
});
