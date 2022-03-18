const getSubAddr = (addr, delta) => {
  const v = Number.parseInt(addr, 16);
  return (v + delta).toString(16).padStart(4, '0');
};

module.exports = async ({ device, client, state, config }) => {
  const { transactionsSent } = state;
  const hassPrefix = `${config.devicePrefix}/${device.addr}`;
  const meshPrefix = `${config.meshPrefix}/${device.addr}/models`;
  const meshHuePrefix = `${config.meshPrefix}/${getSubAddr(
    device.addr,
    1
  )}/models`;
  const meshSatPrefix = `${config.meshPrefix}/${getSubAddr(
    device.addr,
    2
  )}/models`;

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
      color_mode: true,
      supported_color_modes: ['hs'],
      name: `${device.addr}_light`,
      unique_id: device.addr,
    }),
    { retain: true }
  );

  // hass -> mesh
  await client.handleJSON(`${hassPrefix}/cmd`, async (match, payload) => {
    const { state, brightness, color } = payload;
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

    if (color != null && !device.features.update_method) {
      await client.publishJSON(`${meshPrefix}/light-hsl/set/send`, {
        hue: (color.h / 360) * 0xffff,
        saturation: (color.s / 100) * 0xffff,
        lightness: 32000,
        transactionId: tid,
      });
    }

    if (color != null && device.features.update_method === 'hacky') {
      await client.publishJSON(`${meshHuePrefix}/generic-level/set/send`, {
        level: (color.h / 360) * 0xffff - 0x8000,
        transactionId: tid,
      });
      await client.publishJSON(`${meshSatPrefix}/generic-level/set/send`, {
        level: (color.s / 100) * 0xffff - 0x8000,
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
