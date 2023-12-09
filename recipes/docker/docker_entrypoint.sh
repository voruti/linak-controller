#!/bin/bash

# From https://stackoverflow.com/a/64126744
service dbus start
bluetoothd &

/bin/bash

node main.js

# prevent continuous restart loops:
echo "Program exited, sleeping 5 seconds"
sleep 5
