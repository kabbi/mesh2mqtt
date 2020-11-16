mesh2mqtt
---------

A demo project for my smart house to make BLE Mesh and Home Assistant work together.

System components:
- ble mesh network (i'm using some yeelight bulbs and some custom nrf52 devices)
- meshbridge - custom esp32 firmware to relay mesh messages to mqtt and vice versa
- mesh2mqtt.js - handles all the mesh stack functions - crypto, segmentation, parsing, outputs nice jsons to mqtt topics
- mesh2hass.js - listens those jsons and provides hass mqtt discovery and high-level control endpoints

This does not currently support auto-discovery of mesh devices, so you should configure them manually in `devices.js`

Supported device types:
- `onoff-client-button` - mesh buttons (actually, anything using Generic OnOff Client can be configured as hass button)

