const jBinary = require('jbinary');

exports.messages = {
  0xe03298: 'KabbiKVSetInt',
  0xe13298: 'KabbiKVSetIntIndexed',
  0xe23298: 'KabbiKVSetString',
  0xe33298: 'KabbiKVSetStringIndexed',
  0xe43298: 'KabbiKVSetStatus',
  0xe53298: 'KabbiKVGetInt',
  0xe63298: 'KabbiKVGetIntIndexed',
  0xe73298: 'KabbiKVGetIntStatus',
  0xe83298: 'KabbiKVGetString',
  0xe93298: 'KabbiKVGetStringIndexed',
  0xea3298: 'KabbiKVGetStringStatus',
};

exports.typeSet = {
  KabbiKVSetInt: {
    value: 'uint32',
    key: 'string',
  },
  KabbiKVSetIntIndexed: {
    key: 'uint8',
    value: 'uint32',
  },
  KabbiKVSetStatus: {},
};
