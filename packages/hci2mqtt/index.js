const cp = require('child_process');
const mqtt = require('@kabbi/routed-mqtt');
require('dotenv').config();

const client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost');
const prefix = process.env.BRIDGE_MQTT_PREFIX || 'meshbridge/rpi';

const scanner = cp.spawn('hcitool', ['lescan', '--passive'], {
  stdio: 'ignore',
});

scanner.on('close', () => {
  console.log('scanner closed');
  process.exit(1);
});

const parser = cp.spawn('hcidump', ['--raw']);

parser.stdout.on('data', (data) => {
  const str = data.toString('utf8');
  if (!str.startsWith('>')) {
    return;
  }
  const v = str.slice(2).replace(/\s+/g, '');
  const buf = Buffer.from(v, 'hex').slice(14, -1);
  if (buf[1] !== 0x2a) {
    return;
  }
  if (buf[0] !== buf.byteLength - 1) {
    return;
  }
  client.publish(`${prefix}/msg`, buf.slice(2));
});

parser.on('close', () => {
  console.log('hcidump closed');
  process.exit(1);
});

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const sendHciCommand = async (cmd, data) => {
  const hexBytes = [...data].map((v) => v.toString(16).padStart(2, '0'));

  // This is some sad dark magic ):
  // I don't really like hci subsystem on linux
  await cp.spawnSync('hcitool', [
    'cmd',
    '0x08',
    `0x${cmd.toString(16).padStart(4, '0')}`,
    ...hexBytes,
  ]);
};

client.once('connect', async () => {
  await client.handle(`${prefix}/msg/send`, async (match, payload) => {
    if (payload.length >= 32) {
      console.log('dropping message >31 bytes', payload.toString('hex'));
      return;
    }

    const msg = Buffer.concat([
      Buffer.of(payload.length + 2), // adv data header
      Buffer.of(payload.length + 1, 0x2a), // mesh packet header
      payload, // mesh packet
      Buffer.alloc(31 - (payload.length + 2)), // pad up to 31 bytes
    ]);

    // Set adv data
    await sendHciCommand(0x08, msg);

    // Set adv params
    await sendHciCommand(
      0x06,
      // 100 ms interval, non-connectable undirected type
      Buffer.from('A000A0000300000000000000000700', 'hex'),
    );

    // Start advertising
    await sendHciCommand(0x0a, Buffer.of(1));

    await delay(150); // 100 ms adv interval + some safety gap

    // Stop advertising
    await sendHciCommand(0x0a, Buffer.of(0));
  });
});
