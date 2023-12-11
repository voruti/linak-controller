// Low level helper classes to organise methods for interacting with the GATT services/characteristics provided by Linak Desks.

import { Characteristic as NobleCharacteristic } from "@abandonware/noble";

import {
    uuidsMatch,
    sleep,
    Height,
    Speed,
    HeightAndSpeed,
    debugLog,
} from "./util";
import { Config } from "./config";

abstract class Characteristic {
    static uuid: string | null = null;

    static async read(
        config: Config,
        characteristics: NobleCharacteristic[]
    ): Promise<Buffer> {
        const characteristic = characteristics.filter((characteristic) =>
            uuidsMatch(characteristic.uuid, this.uuid)
        )[0];

        const result = await characteristic.readAsync();
        debugLog(config, characteristic.uuid, "did read", result);
        return result;
    }

    static async write(
        config: Config,
        characteristics: NobleCharacteristic[],
        value: Buffer
    ): Promise<void> {
        const characteristic = characteristics.filter((characteristic) =>
            uuidsMatch(characteristic.uuid, this.uuid)
        )[0];

        debugLog(config, characteristic.uuid, "write", value);
        return characteristic.writeAsync(value, true);
    }

    static async subscribe(
        config: Config,
        characteristics: NobleCharacteristic[],
        callback: (data: Buffer) => void
    ): Promise<void> {
        const characteristic = characteristics.filter((characteristic) =>
            uuidsMatch(characteristic.uuid, this.uuid)
        )[0];

        characteristic.on("data", (data: Buffer, _: boolean) => {
            debugLog(config, characteristic.uuid, "received data", data);
            callback(data);
        });

        debugLog(config, characteristic.uuid, "subscribe");
        return await characteristic.subscribeAsync();
    }

    static async unsubscribe(
        config: Config,
        characteristics: NobleCharacteristic[]
    ): Promise<void> {
        const characteristic = characteristics.filter((characteristic) =>
            uuidsMatch(characteristic.uuid, this.uuid)
        )[0];

        characteristic.removeAllListeners("data");

        debugLog(config, characteristic.uuid, "unsubscribe");
        return await characteristic.unsubscribeAsync();
    }
}

abstract class Service {
    static uuid: string | null = null;
}

// Generic Access

export class GenericAccessDeviceNameCharacteristic extends Characteristic {
    static override uuid = "00002A00-0000-1000-8000-00805F9B34FB";
}

export class GenericAccessServiceChangedCharacteristic extends Characteristic {
    static override uuid = "00002A05-0000-1000-8000-00805F9B34FB";
}

export class GenericAccessManufacturerCharacteristic extends Characteristic {
    static override uuid = "00002A29-0000-1000-8000-00805F9B34FB";
}

export class GenericAccessModelNumberCharacteristic extends Characteristic {
    static override uuid = "00002A24-0000-1000-8000-00805F9B34FB";
}

export class GenericAccessService extends Service {
    static override uuid = "00001800-0000-1000-8000-00805F9B34FB";

    static DEVICE_NAME = GenericAccessDeviceNameCharacteristic;
    static SERVICE_CHANGED = GenericAccessServiceChangedCharacteristic;
    static MANUFACTURER = GenericAccessManufacturerCharacteristic;
    static MODEL_NUMBER = GenericAccessModelNumberCharacteristic;
}

// Reference Input

export class ReferenceInputOneCharacteristic extends Characteristic {
    static override uuid = "99fa0031-338a-1024-8a49-009c0215f78a";
}

export class ReferenceInputService extends Service {
    static override uuid = "99fa0030-338a-1024-8a49-009c0215f78a";

    static ONE = ReferenceInputOneCharacteristic;

    static encodeHeight(height: number | string): Buffer {
        try {
            const intValue = parseInt(height.toString());
            if (intValue < 0 || intValue > 65535) {
                throw new Error(
                    "Height must be an integer between 0 and 65535"
                );
            }

            const buffer = Buffer.alloc(2); // Allocate a buffer of 2 bytes (16 bits)
            buffer.writeUInt16LE(intValue, 0); // Write the 16-bit integer in little-endian format
            return buffer;
        } catch (error) {
            throw new Error("Invalid height value");
        }
    }
}

// Reference Output

export class ReferenceOutputOneCharacteristic extends Characteristic {
    static override uuid = "99fa0021-338a-1024-8a49-009c0215f78a";
}

export class ReferenceOutputService extends Service {
    static override uuid = "99fa0020-338a-1024-8a49-009c0215f78a";

    static ONE = ReferenceOutputOneCharacteristic;

    static decodeHeightSpeed(data: Buffer, config: Config): HeightAndSpeed {
        debugLog(config, "decodeHeightSpeed entering with", data);

        const dataView = new DataView(new Uint8Array(data).buffer);
        const height: number = dataView.getUint16(0, true);
        const speed: number = dataView.getInt16(2, true);

        debugLog(config, "result is height", height, "and speed", speed);
        return {
            height: new Height(height, config),
            speed: new Speed(speed),
        };
    }

    static async getHeightSpeed(
        characteristics: NobleCharacteristic[],
        config: Config
    ): Promise<HeightAndSpeed> {
        const data = await this.ONE.read(config, characteristics);
        return this.decodeHeightSpeed(data, config);
    }
}

// Control

export class ControlCommandCharacteristic extends Characteristic {
    static override uuid = "99fa0002-338a-1024-8a49-009c0215f78a";

    static CMD_MOVE_DOWN = 70;
    static CMD_MOVE_UP = 71;
    static CMD_WAKEUP = 254;
    static CMD_STOP = 255;

    static async writeCommand(
        config: Config,
        characteristics: NobleCharacteristic[],
        command: number
    ): Promise<void> {
        this.write(
            config,
            characteristics,
            Buffer.from(new Uint16Array([command, 0]))
        );
    }
}

export class ControlErrorCharacteristic extends Characteristic {
    static override uuid = "99fa0003-338a-1024-8a49-009c0215f78a";
}

export class ControlService extends Service {
    static override uuid = "99fa0001-338a-1024-8a49-009c0215f78a";

    static COMMAND = ControlCommandCharacteristic;
    static ERROR = ControlErrorCharacteristic;
}

// DPG

export class DPGDPGCharacteristic extends Characteristic {
    static override uuid = "99fa0011-338a-1024-8a49-009c0215f78a";

    static CMD_GET_CAPABILITIES = 128;
    static CMD_BASE_OFFSET = 129;
    static CMD_USER_ID = 134;

    static async readCommand(
        config: Config,
        characteristics: NobleCharacteristic[],
        command: number
    ): Promise<Buffer> {
        await this.write(
            config,
            characteristics,
            Buffer.from(new Uint8Array([127, command, 0]))
        );
        await sleep(500);
        return await this.read(config, characteristics);
    }

    static async writeCommand(
        config: Config,
        characteristics: NobleCharacteristic[],
        command: number,
        data: Buffer
    ): Promise<void> {
        const header = new Uint8Array([127, command, 128]);
        const buffer = new Uint8Array(header.length + data.length);
        buffer.set(header);
        buffer.set(data, header.length);
        await this.write(config, characteristics, Buffer.from(buffer));
    }
}

export class DPGService extends Service {
    static override uuid = "99fa0010-338a-1024-8a49-009c0215f78a";

    static DPG = DPGDPGCharacteristic;

    static isValidResponse(response: Buffer): boolean {
        return response[0] === 0x1;
    }

    static isValidData(data: Buffer): boolean {
        return data[1] > 0x1;
    }

    static async dpgCommand(
        config: Config,
        characteristics: NobleCharacteristic[],
        command: number,
        data?: Buffer
    ) {
        //const [iter, callback] = makeIter();
        await this.DPG.subscribe(config, characteristics, () => {});

        let result: Buffer | null = null;
        if (data) {
            await this.DPG.writeCommand(config, characteristics, command, data);
        } else {
            result = await this.DPG.readCommand(
                config,
                characteristics,
                command
            );
        }

        await this.DPG.unsubscribe(config, characteristics);
        if (result && result[0] === 1) {
            return result.subarray(2);
        }
        return null;
    }
}
