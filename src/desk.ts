// High level helper class to organise methods for performing actions with a Linak Desk.

import * as noble from '@abandonware/noble';
 import { DPGService } from './gatt';
import { ControlService } from './gatt';
 import { ReferenceInputService } from './gatt';
 import { ReferenceOutputService } from './gatt';
import { bytesToHex, Height, HeightAndSpeed, sleep, Speed } from './util';
import { Config } from './config';

export class Desk {
    static async initialize(characteristics: noble.Characteristic[],config:Config): Promise<void> {
        // Read capabilities
        const capabilities = this.decodeCapabilities(
            await DPGService.dpgCommand(characteristics, DPGService.DPG.CMD_GET_CAPABILITIES)
        );
        console.log(`Capabilities: ${JSON.stringify(capabilities)}`);

        // Read the user id
        const userId = await DPGService.dpgCommand(characteristics, DPGService.DPG.CMD_USER_ID);
        console.log(`User ID: ${bytesToHex(userId)}`);
        if (userId && userId[0] !== 1) {
            // For DPG1C it is important that the first byte is set to 1
            // The other bytes do not seem to matter
            userId[0] = 1;
            console.log(`Setting user ID to ${bytesToHex(userId)}`);
            await DPGService.dpgCommand(characteristics, DPGService.DPG.CMD_USER_ID, userId);
        }

        // Check if base height should be taken from controller
        if (!config.baseHeight ) {
            const resp = await DPGService.dpgCommand(characteristics, DPGService.DPG.CMD_BASE_OFFSET);
            console.log("baseHeight resp:",resp);
            if (resp) {
                // unsigned short integer in little-endian byte order
                const baseHeight = resp.subarray(1).readUInt16LE(0) / 10;
                console.log(`Base height from desk: ${baseHeight.toFixed(0)}mm`);
                config.baseHeight = baseHeight;
            }
        }
    }

    static async wakeup(characteristics: noble.Characteristic[]): Promise<void> {
        await ControlService.COMMAND.writeCommand(characteristics, ControlService.COMMAND.CMD_WAKEUP);
    }

    static async moveTo(characteristics: noble.Characteristic[], target: Height, config:Config): Promise<void> {
        const heightAndSpeed = await ReferenceOutputService.getHeightSpeed(characteristics,config);
        if (heightAndSpeed.height.value === target.value) {
            return;
        }

        await this.wakeup(characteristics);
        await this.stop(characteristics);

        const data = ReferenceInputService.encodeHeight(target.value);

        while (true) {
            await ReferenceInputService.ONE.write(characteristics, data);
            await sleep(config.moveCommandPeriod * 1000 );
            const heightAndSpeedUpdated = await ReferenceOutputService.getHeightSpeed(characteristics,config);
            if (heightAndSpeedUpdated.speed.value === 0) {
                break;
            }
            console.log(`Height: ${heightAndSpeedUpdated.height.human.toFixed(0)}mm Speed: ${heightAndSpeedUpdated.speed.human.toFixed(0)}mm/s`);
        }
    }

    static async getHeightSpeed(characteristics: noble.Characteristic[],config:Config): Promise<HeightAndSpeed> {
        return await ReferenceOutputService.getHeightSpeed(characteristics,config);
    }

    static async watchHeightSpeed(characteristics: noble.Characteristic[],config:Config): Promise<void> {
        // Listen for height changes

        const callback = (/*sender: any,*/ data: any) => {
            const heightAndSpeed = ReferenceOutputService.decodeHeightSpeed(data,config);
            console.log(`Height: ${heightAndSpeed.height.human.toFixed(0)}mm Speed: ${heightAndSpeed.speed.human.toFixed(0)}mm/s`);
        };

        await ReferenceOutputService.ONE.subscribe(characteristics, callback);
        await new Promise(() => {}); // Use a dummy promise to keep the function running
    }

    static async stop(characteristics: noble.Characteristic[]): Promise<void> {
        try {
            await ControlService.COMMAND.writeCommand(characteristics, ControlService.COMMAND.CMD_STOP);
        } catch (e) {
            console.error("todo handle",e)
            /*if (!(e instanceof BleakDBusError)) {
                throw e;
            }*/
            // Harmless exception that happens on Raspberry Pis
            // bleak.exc.BleakDBusError: [org.bluez.Error.NotPermitted] Write acquired
        }
    }

    static decodeCapabilities(caps: Buffer | null) {
        if (!caps || caps.length < 2) {
            return {};
        }
        console.log("caps",caps)
        const capByte = caps[0];
        console.log("capByte",capByte)
        const refByte = caps[1];
        console.log("refByte",refByte)
        return {
            memSize: capByte & 7,
            autoUp: (capByte & 8) !== 0,
            autoDown: (capByte & 16) !== 0,
            bleAllow: (capByte & 32) !== 0,
            hasDisplay: (capByte & 64) !== 0,
            hasLight: (capByte & 128) !== 0,
        };
    }
}
