#!/bin/bash

rm -rf /run/dbus

# From https://stackoverflow.com/a/64126744
service dbus start
bluetoothd &

/bin/bash

node main.js
