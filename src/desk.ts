// High level helper class to organise methods for performing actions with a Linak Desk.

import * as noble from '@abandonware/noble';
 import { DPGService } from './gatt';
// import { ControlService } from './gatt';
// import { ReferenceInputService } from './gatt';
// import { ReferenceOutputService } from './gatt';
import { bytesToHex, Height, Speed } from './util';

export class Desk {
    static async initialise(characteristics: noble.Characteristic[]): Promise<void> {
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

        /*if (config.baseHeight === null) {
            const resp = await DPGService.dpgCommand(client, DPGService.DPG.CMD_BASE_OFFSET);
            if (resp) {
                const baseHeight = struct.unpack('<H', resp.slice(1))[0] / 10;
                console.log(`Base height from desk: ${baseHeight.toFixed(0)}mm`);
                config.baseHeight = baseHeight;
            }
        }*/
    }
/*
    static async wakeup(client: BleakClient): Promise<void> {
        await ControlService.COMMAND.writeCommand(client, ControlService.COMMAND.CMD_WAKEUP);
    }

    static async moveTo(client: BleakClient, target: Height): Promise<void> {
        const [initialHeight, speed] = await ReferenceOutputService.getHeightSpeed(client);
        if (initialHeight.value === target.value) {
            return;
        }

        await this.wakeup(client);
        await this.stop(client);

        const data = ReferenceInputService.encodeHeight(target.value);

        while (true) {
            await ReferenceInputService.ONE.write(client, data);
            await new Promise((resolve) => setTimeout(resolve, config.moveCommandPeriod));
            const [height, speed] = await ReferenceOutputService.getHeightSpeed(client);
            if (speed.value === 0) {
                break;
            }
            console.log(`Height: ${height.human.toFixed(0)}mm Speed: ${speed.human.toFixed(0)}mm/s`);
        }
    }

    static async getHeightSpeed(client: BleakClient): Promise<[Height, Speed]> {
        return await ReferenceOutputService.getHeightSpeed(client);
    }

    static async watchHeightSpeed(client: BleakClient): Promise<void> {
        const callback = (sender: any, data: any) => {
            const [height, speed] = ReferenceOutputService.decodeHeightSpeed(data);
            console.log(`Height: ${height.human.toFixed(0)}mm Speed: ${speed.human.toFixed(0)}mm/s`);
        };

        await ReferenceOutputService.ONE.subscribe(client, callback);
        await new Promise(() => {}); // Use a dummy promise to keep the function running
    }

    static async stop(client: BleakClient): Promise<void> {
        try {
            await ControlService.COMMAND.writeCommand(client, ControlService.COMMAND.CMD_STOP);
        } catch (e) {
            if (!(e instanceof BleakDBusError)) {
                throw e;
            }
            // Harmless exception that happens on Raspberry Pis
            // bleak.exc.BleakDBusError: [org.bluez.Error.NotPermitted] Write acquired
        }
    }
*/
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
