// This maps model types and messages to mqtt topic names
module.exports = {
  GenericOnOffGet: ['generic-onoff', 'get'],
  GenericOnOffSet: ['generic-onoff', 'set'],
  GenericOnOffStatus: ['generic-onoff', 'status'],
  GenericOnOffSetUnacknowledged: ['generic-onoff', 'set-unack'],
  LightLightnessStatus: ['light-lightness', 'status'],
  LightLightnessSetUnacknowledged: ['light-lightness', 'set-unack'],
  LightCTLTemperatureStatus: ['light-ctl', 'temp-status'],
  LightCTLTemperatureSetUnacknowledged: ['light-ctl', 'temp-set-unack'],
};
