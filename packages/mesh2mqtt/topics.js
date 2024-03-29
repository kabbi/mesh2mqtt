// This maps model types and messages to mqtt topic names
module.exports = {
  GenericOnOffGet: ['generic-onoff', 'get'],
  GenericOnOffSet: ['generic-onoff', 'set'],
  GenericOnOffStatus: ['generic-onoff', 'status'],
  GenericOnOffSetUnacknowledged: ['generic-onoff', 'set-unack'],
  GenericLevelGet: ['generic-level', 'get'],
  GenericLevelSet: ['generic-level', 'set'],
  GenericLevelStatus: ['generic-level', 'status'],
  GenericLevelSetUnacknowledged: ['generic-level', 'set-unack'],
  GenericBatteryStatus: ['generic-battery', 'status'],
  LightLightnessStatus: ['light-lightness', 'status'],
  LightLightnessSet: ['light-lightness', 'set'],
  LightLightnessSetUnacknowledged: ['light-lightness', 'set-unack'],
  LightCTLTemperatureStatus: ['light-ctl', 'temp-status'],
  LightCTLTemperatureSet: ['light-ctl', 'temp-set'],
  LightCTLTemperatureSetUnacknowledged: ['light-ctl', 'temp-set-unack'],
  LightHSLHueStatus: ['light-hsl', 'hue-status'],
  LightHSLHueSet: ['light-hsl', 'hue-set'],
  LightHSLSet: ['light-hsl', 'set'],
  LightHSLStatus: ['light-hsl', 'status'],
  SensorStatus: ['sensor', 'status'],
  SensorGet: ['sensor', 'get'],
  KabbiStripSetSegment: ['kabbi-strip', 'set-segment'],
  KabbiStripSetParam: ['kabbi-strip', 'set-param'],
  KabbiStripParamStatus: ['kabbi-strip', 'param-status'],
  KabbiKVSetInt: ['kabbi-kv', 'set-int'],
  KabbiKVSetIntIndexed: ['kabbi-kv', 'set-int-indexed'],
  KabbiKVSetStatus: ['kabbi-kv', 'set-status'],
};
