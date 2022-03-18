module.exports = async ({ device, client, state, config }) => {
  const { transactionsSent } = state;
  const hassPrefix = `${config.devicePrefix}/${device.addr}`;
  const meshPrefix = `${config.meshPrefix}/${device.addr}/models`;

  await client.publish(
    `homeassistant/light/${device.addr}/light/config`,
    JSON.stringify({
      device: {
        identifiers: [`blemesh_${device.addr}`],
        name: device.addr,
      },
      schema: 'json',
      command_topic: `${hassPrefix}/cmd`,
      state_topic: `${hassPrefix}/state`,
      brightness: !!device.features?.brightness,
      brightness_scale: 0xffff,
      name: `${device.addr}_light`,
      unique_id: device.addr,
    }),
    { retain: true }
  );

  // hass -> mesh
  await client.handleJSON(`${hassPrefix}/cmd`, async (match, payload) => {
    const { state, brightness } = payload;
    const tid = transactionsSent.get(device.addr) || 0;
    transactionsSent.set(device.addr, tid + 1);

    await client.publishJSON(`${meshPrefix}/generic-onoff/set/send`, {
      status: state.toLowerCase(),
      transactionId: tid,
    });

    if (brightness != null) {
      await client.publishJSON(`${meshPrefix}/generic-level/set/send`, {
        level: brightness - 0x8000,
        transactionId: tid,
      });
    }
  });

  // mesh -> hass
  await client.handleJSON(
    `${meshPrefix}/generic-onoff/status`,
    async (match, payload) => {
      await client.publishJSON(`${hassPrefix}/state`, {
        state: `${payload.status}`.toUpperCase(),
      });
    }
  );
};
