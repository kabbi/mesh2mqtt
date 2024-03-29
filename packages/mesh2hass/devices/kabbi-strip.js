module.exports = async ({ device, client, state, config }) => {
  const { transactionsSent } = state;
  const hassPrefix = `${config.devicePrefix}/${device.addr}`;
  const meshPrefix = `${config.meshPrefix}/${device.addr}/models`;

  const KeyIndex = ['on', 'color'];

  await client.publish(
    `homeassistant/light/${device.addr}/light/config`,
    JSON.stringify({
      schema: 'json',
      name: `${device.addr}_light`,
      unique_id: device.addr,
      device: {
        identifiers: [`blemesh_${device.addr}`],
        name: device.addr,
      },
      // TODO: Get rid of optimistic
      optimistic: true,
      color_mode: true,
      command_topic: `${hassPrefix}/cmd`,
      state_topic: `${hassPrefix}/state`,
      supported_color_modes: [device.features.white_channel ? 'rgbw' : 'rgb'],
    }),
    { retain: true }
  );

  // hass -> mesh
  await client.handleJSON(`${hassPrefix}/cmd`, async (match, payload) => {
    const { state, color } = payload;
    const tid = transactionsSent.get(device.addr) || 0;
    transactionsSent.set(device.addr, tid + 1);

    if (state && Object.keys(payload).length === 1) {
      await client.publishJSON(`${meshPrefix}/generic-onoff/set/send`, {
        status: state.toLowerCase(),
        transactionId: tid,
      });
    }

    if (color) {
      const packedColor =
        ((color.r << 24) |
          (color.g << 16) |
          (color.b << 8) |
          (color.w || 0)) >>>
        0;
      await client.publishJSON(`${meshPrefix}/kabbi-kv/set-int-indexed/send`, {
        key: KeyIndex.indexOf('color'),
        value: packedColor,
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
