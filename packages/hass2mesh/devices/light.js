const {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  callService,
  getStates,
} = require('home-assistant-js-websocket');

module.exports = ({ mqtt, meshPrefix, entity, addr, hass, db }) => {
  const sendMeshMsg = (to, type, payload) => {
    mqtt.publishJSON(`${meshPrefix}/tx`, {
      type,
      payload,
      meta: {
        ttl: 7,
        type: 'access',
        from: addr,
        to,
      },
    });
  };

  mqtt.handleJSON(`${meshPrefix}/rx`, (match, msg) => {
    const { type, payload, meta } = msg;

    if (meta.to !== parseInt(addr, 16)) {
      return;
    }

    switch (type) {
      case 'GenericOnOffSet':
        callService(hass, 'light', `turn_${payload.status}`, {
          entity_id: entity.entity_id,
        });
        sendMeshMsg(meta.from, 'GenericOnOffStatus', {
          status: payload.status,
        });
        break;
      case 'GenericOnOffSetUnacknowledged':
        callService(hass, 'light', `turn_${payload.status}`, {
          entity_id: entity.entity_id,
        });
        break;
      default:
        console.log(`- [${addr}] unhandled mesh msg ${type}`);
        break;
    }
  });
};
