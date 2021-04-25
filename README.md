mesh2mqtt
---------

A demo project for my smart house to make BLE Mesh and Home Assistant work together.

System components:
- ble mesh network (i'm using some yeelight bulbs and some custom nrf52 devices running zephyr firmware)
- meshbridge - custom esp32 firmware to relay mesh messages to mqtt and vice versa
- packages/hci2mqtt - simple service to relay mesh messages from hardware bluetooth device to mqtt topic, tested on raspberry pi 4 internal ble module
- packages/mesh2mqtt - handles all the mesh stack functions - crypto, segmentation, parsing, outputs nice jsons to mqtt topics
- packages/mesh2hass - listens those jsons and provides hass mqtt discovery and high-level control endpoints

To run in docker, see example [docker-compose](docker-compose.yml).

This does not currently support auto-discovery of mesh devices, so you should configure them manually in `devices.json`

Supported device types:
- `onoff-client-button` - mesh buttons (actually, anything using Generic OnOff Client can be configured as hass button)

