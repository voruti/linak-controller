// Low level helper classes to organise methods for interacting with the GATT services/characteristics provided by Linak Desks.


import {Peripheral, Characteristic as NobleCharacteristic}  from '@abandonware/noble';
import {
    bytesToHex,
    hexToBytes,
    bytesToInt,
    bytesToUtf8,
    uuidsMatch,
    sleep,
    makeIter,
    Height,
    Speed,
    HeightAndSpeed,
} from "./util";
import { Config } from './config';

abstract class Characteristic {
    static uuid: string | null = null;

    static async read(characteristics: NobleCharacteristic[]): Promise<Buffer> {
        const characteristic = characteristics
        .filter(characteristic =>     uuidsMatch(characteristic.uuid,  this.uuid))
        [0];

        const result = await characteristic.readAsync();
        console.log(characteristic.uuid,"did read",result)
         return result;
    }

    static async write(characteristics: NobleCharacteristic[], value: Buffer): Promise<void> {
        const characteristic = characteristics
        .filter(characteristic =>     uuidsMatch(characteristic.uuid,  this.uuid))
        [0];

        console.log(characteristic.uuid,"write",value)
        return  characteristic            .writeAsync( value, true);
    }

    static async subscribe(characteristics: NobleCharacteristic[] ,callback:(state:any)=>void): Promise<void> {
        const characteristic = characteristics
        .filter(characteristic =>     uuidsMatch(characteristic.uuid,  this.uuid))
        [0];
        
        characteristic.on('notify', (state)=>{
            console.log(characteristic.uuid,"received notification",state)
            callback(state);
        });

        console.log(characteristic.uuid,"subscribe")
        return  characteristic.subscribeAsync();
    }

    static async unsubscribe(characteristics: NobleCharacteristic[]): Promise<void> {
        const characteristic = characteristics
        .filter(characteristic =>     uuidsMatch(characteristic.uuid,  this.uuid))
        [0];
        
        characteristic.removeAllListeners("notify")

        console.log(characteristic.uuid,"unsubscribe")
        return  characteristic.unsubscribeAsync();
    }
}

abstract class Service {
    static uuid: string | null = null;
}

// Generic Access

export class GenericAccessDeviceNameCharacteristic extends Characteristic {
    static override  uuid = "00002A00-0000-1000-8000-00805F9B34FB";
}

export class GenericAccessServiceChangedCharacteristic extends Characteristic {
    static  override uuid = "00002A05-0000-1000-8000-00805F9B34FB";
}

export class GenericAccessManufacturerCharacteristic extends Characteristic {
    static  override uuid = "00002A29-0000-1000-8000-00805F9B34FB";
}

export class GenericAccessModelNumberCharacteristic extends Characteristic {
    static  override uuid = "00002A24-0000-1000-8000-00805F9B34FB";
}

export class GenericAccessService extends Service {
    static  override uuid = "00001800-0000-1000-8000-00805F9B34FB";

    static DEVICE_NAME = GenericAccessDeviceNameCharacteristic;
    static SERVICE_CHANGED = GenericAccessServiceChangedCharacteristic;
    static MANUFACTURER = GenericAccessManufacturerCharacteristic;
    static MODEL_NUMBER = GenericAccessModelNumberCharacteristic;
}

// Reference Input

export class ReferenceInputOneCharacteristic extends Characteristic {
    static  override uuid = "99fa0031-338a-1024-8a49-009c0215f78a";
}

export class ReferenceInputService extends Service {
    static override  uuid = "99fa0030-338a-1024-8a49-009c0215f78a";

    static ONE = ReferenceInputOneCharacteristic;

    static encodeHeight(height: number | string): Buffer {
        try {
            return Buffer.from( 
                new Uint32Array([parseInt(height.toString())])
            );
        } catch (error) {
            throw new Error("Height must be an integer between 0 and 65535");
        }
    }
}

// Reference Output

export class ReferenceOutputOneCharacteristic extends Characteristic {
    static  override uuid = "99fa0021-338a-1024-8a49-009c0215f78a";
}

export class ReferenceOutputService extends Service {
    static override  uuid = "99fa0020-338a-1024-8a49-009c0215f78a";

    static ONE = ReferenceOutputOneCharacteristic;

    static decodeHeightSpeed(data: Uint8Array,config:Config): HeightAndSpeed {
        console.log("decodeHeightSpeed entering with",data);

         const dataView  = new DataView(data.buffer);
         const height: number = dataView.getUint16(0, true);
        const speed: number = dataView.getInt16(2, true);

        console.log("result is height",height,"and speed",speed);
        return {
            height:new Height(height,config),
             speed:new Speed(speed)
        };
    }

    static async getHeightSpeed(characteristics: NobleCharacteristic[],config:Config): Promise<HeightAndSpeed> {
        const data = await this.ONE.read(characteristics);
        return this.decodeHeightSpeed(new Uint8Array(data),config);
    }
}

// Control

export class ControlCommandCharacteristic extends Characteristic {
    static  override uuid = "99fa0002-338a-1024-8a49-009c0215f78a";

    static CMD_MOVE_DOWN = 70;
    static CMD_MOVE_UP = 71;
    static CMD_WAKEUP = 254;
    static CMD_STOP = 255;

    static async writeCommand(
        characteristics: NobleCharacteristic[],
        command: number
    ): Promise<void> {
        this.write(
            characteristics,
            Buffer.from(new Uint16Array([command, 0]))
        )
    }
}

export class ControlErrorCharacteristic extends Characteristic {
    static  override uuid = "99fa0003-338a-1024-8a49-009c0215f78a";
}

export class ControlService extends Service {
    static  override uuid = "99fa0001-338a-1024-8a49-009c0215f78a";

    static COMMAND = ControlCommandCharacteristic;
    static ERROR = ControlErrorCharacteristic;
}

// DPG

export class DPGDPGCharacteristic extends Characteristic {
    static override  uuid = "99fa0011-338a-1024-8a49-009c0215f78a";

    static CMD_GET_CAPABILITIES = 128;
    static CMD_BASE_OFFSET = 129;
    static CMD_USER_ID = 134;

    static async readCommand(
        characteristics: NobleCharacteristic[],
        command: number
    ): Promise<Buffer> {
        await this.write(characteristics, Buffer.from(new Uint8Array([127, command, 0])));
        await sleep(500);
        return await this.read(characteristics)
    }

    static async writeCommand(
        characteristics: NobleCharacteristic[],
        command: number,
        data: Buffer
    ): Promise<void> {
        const header = new Uint8Array([127, command, 128]);
        const buffer = new Uint8Array(header.length + data.length);
        buffer.set(header);
        buffer.set(data, header.length);
        await this.write(characteristics, Buffer.from(buffer));
    }
}

export class DPGService extends Service {
    static override  uuid = "99fa0010-338a-1024-8a49-009c0215f78a";

    static DPG = DPGDPGCharacteristic;

    static isValidResponse(response: Buffer): boolean {
        return response[0] === 0x1;
    }

    static isValidData(data: Buffer): boolean {
        return data[1] > 0x1;
    }

    static async dpgCommand(
        characteristics: NobleCharacteristic[],
        command: number,
        data?: Buffer 
    ) {
        //const [iter, callback] = makeIter();
        await this.DPG.subscribe(characteristics,()=>{});

        let result: Buffer | null = null;
        if (data) {
             await this.DPG.writeCommand(characteristics, command, data);
        } else {
             result = await this.DPG.readCommand(characteristics, command);
        }

        await this.DPG.unsubscribe(characteristics);
        if (result  && result[0] === 1) {
            return result.subarray(2);
        }
        return null;
    }
}
