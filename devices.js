module.exports = [
  {
    addr: '1006',
    type: 'onoff-client-button',
  },
  // Kitchen
  {
    addr: '0015',
    type: 'light',
    features: [
      { type: 'brightness' },
      {
        type: 'color-temperature',
        overrideAddr: '0016',
      },
    ],
  },
  {
    addr: '0017',
    type: 'light',
    features: [
      { type: 'brightness' },
      {
        type: 'color-temperature',
        overrideAddr: '0018',
      },
    ],
  },
  // Main
  {
    addr: '000d',
    type: 'light',
    features: [
      { type: 'brightness' },
      {
        type: 'color-temperature',
        overrideAddr: '000e',
      },
    ],
  },
  {
    addr: '0011',
    type: 'light',
    features: [
      { type: 'brightness' },
      {
        type: 'color-temperature',
        overrideAddr: '0012',
      },
    ],
  },
  {
    addr: '0019',
    type: 'light',
    features: [
      { type: 'brightness' },
      {
        type: 'color-temperature',
        overrideAddr: '001a',
      },
    ],
  },
];
