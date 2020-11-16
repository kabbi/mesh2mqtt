const mqtt = require('async-mqtt');
const { parse, match } = require('path-to-regexp');

const patchClient = (client) => {
  client.handle = async (topicPattern, handler) => {
    const tokens = parse(topicPattern);
    const matcher = match(topicPattern);

    const wildcardTopic = tokens
      .map((v) => {
        if (typeof v === 'string') {
          return v;
        }
        return `${v.prefix}+`;
      })
      .join('');

    await client.subscribe(wildcardTopic);
    client.on('message', (topic, payload) => {
      const matched = matcher(topic);
      if (!matched) {
        return;
      }

      handler(matched, payload);
    });
  };
};

module.exports = {
  connect: (...args) => {
    const client = mqtt.connect(...args);
    patchClient(client);
    return client;
  },
};
