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

  client.publishJSON = async (topic, payload) => {
    await client.publish(topic, JSON.stringify(payload));
  };

  client.handleJSON = async (topicPattern, handler) => {
    await client.handle(topicPattern, (match, payload) =>
      handler(match, JSON.parse(payload)),
    );
  };
};

module.exports = {
  connect: (...args) => {
    const client = mqtt.connect(...args);
    patchClient(client);
    return client;
  },
};
