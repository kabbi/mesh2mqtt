const jBinary = require('jbinary');

exports.messages = {
  0xc43298: 'KabbiStripStartEffect',
  0xc53298: 'KabbiStripStartEffectStatus',
  0xc63298: 'KabbiStripStopEffect',
  0xc73298: 'KabbiStripStopEffectStatus',
  0xc83298: 'KabbiStripSetParam',
  0xc93298: 'KabbiStripGetParam',
  0xca3298: 'KabbiStripParamStatus',
};

exports.typeSet = {
  KabbiStripStartEffect: {
    flags: 'uint8',
    name_len: 'uint8',
    name: 'string',
  },
  KabbiStripStartEffectStatus: {
    pid: 'uint8',
  },
  KabbiStripStopEffect: {
    pid: 'uint8',
  },
  KabbiStripStopEffectStatus: {
    result: 'uint8',
  },
  KabbiStripSetParam: {
    value: 'uint32',
    key: 'string',
  },
  KabbiStripGetParam: {
    key: 'string',
  },
  KabbiStripParamStatus: {
    result: 'uint8',
    value: 'uint32',
  },
};
