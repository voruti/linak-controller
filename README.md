# linak-controller

(Previously `idasen-controller`)

Linak make motorised standing desks. They can be controlled by a physical switch on the desks or via bluetooth using an phone app. This is a script to control Linak desks via bluetooth from any other device.

Note: This script may not work with all Linak desks - see below for comaptible models.

## Set up

### Prerequisites

- Windows / Linux / Mac (tested on a Raspberry Pi 4)
- The desk should be paired to the device.

### Working Desks

- Ikea Idasen - works (my desk!)
- iMovr Lander - reported working [43](https://github.com/rhyst/linak-controller/issues/43)
- Linak DPG1C - reported working [32](https://github.com/rhyst/linak-controller/issues/32)
- Linak DPG1M - reported working [32](https://github.com/rhyst/linak-controller/issues/32)

### Install

Install using Docker:

```bash
cd recipes/docker
sudo killall -9 bluetoothd
docker compose up -d
```

### Configuration

Adjust the `docker-compose.yml` file to your needs.

Config options:

| Option                | Description                                                                                           | Default                     |
| --------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- |
| `mac_address`         | The MAC address (or UUID on MacOS) of the desk. This is required.                                     |                             |
| `base_height`         | The lowest possible height (mm) of the desk top from the floor By default this is read from the desk. | `null`.                     |
| `move_command_period` | Time between move commands when using `move-to` (seconds).                                            | `0.4`                       |
| `server_address`      | The address the server should run at (if running server).                                             | `127.0.0.1`                 |
| `server_port`         | The port the server should run on (if running server).                                                | `9123`                      |

#### Device MAC addresses

- On Linux, device MAC addresses can be found using `bluetoothctl` and bluetooth adapter names can be found with `hcitool dev`
- On Windows you can use [Bluetooth LE Explorer](https://www.microsoft.com/en-us/p/bluetooth-le-explorer/9n0ztkf1qd98?activetab=pivot:overviewtab).
- On MacOS you can pair the device with [Bluetility](https://github.com/jnross/Bluetility), but you must use the UUID instead of the Mac Address.

## Usage

See [openapi.yaml](reference/openapi.yaml).

## Troubleshooting

### Desk movement stuttering

Try lowering the `move_command_period` config value.

## Projects using this project

Other useful projects that make use of this one:

- [Home Assistant Integration](https://github.com/j5lien/esphome-idasen-desk-controller) by @j5lien

## Attribution

Some ideas stolen from:

- [idasen-controller](https://github.com/pfilipp/idasen-controller) by @pfilipp for working out the functionality of the REFERENCE_INPUT characteristic which allows more accurate movement.
- [linak_bt_desk](https://github.com/anetczuk/linak_bt_desk) by @anetczuk (forked from @zewelor) for general information (particularly the initialisation though)
