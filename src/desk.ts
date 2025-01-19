// High level helper class to organise methods for performing actions with a Linak Desk.

import noble from "@abandonware/noble";

import { DPGService } from "./gatt";
import { ControlService } from "./gatt";
import { ReferenceInputService } from "./gatt";
import { ReferenceOutputService } from "./gatt";
import { bytesToHex, debugLog, Height, HeightAndSpeed, sleep } from "./util";
import { Config } from "./config";

interface Capabilities {
    memSize: number;
    autoUp: boolean;
    autoDown: boolean;
    bleAllow: boolean;
    hasDisplay: boolean;
    hasLight: boolean;
}

export class Desk {
    constructor(
        private characteristics: noble.Characteristic[],
        private config: Config
    ) {}

    public async initialize(): Promise<void> {
        // Read capabilities
        const capabilities: Capabilities | null = Desk.decodeCapabilities(
            await DPGService.dpgCommand(
                this.config,
                this.characteristics,
                DPGService.DPG.CMD_GET_CAPABILITIES
            ),
            this.config
        );
        console.log(`Capabilities: ${JSON.stringify(capabilities)}`);

        // Read the user id
        const userId = await DPGService.dpgCommand(
            this.config,
            this.characteristics,
            DPGService.DPG.CMD_USER_ID
        );
        console.log(`User ID: ${bytesToHex(userId)}`);
        if (userId && userId[0] !== 1) {
            // For DPG1C it is important that the first byte is set to 1
            // The other bytes do not seem to matter
            userId[0] = 1;
            console.log(`Setting user ID to ${bytesToHex(userId)}`);
            await DPGService.dpgCommand(
                this.config,
                this.characteristics,
                DPGService.DPG.CMD_USER_ID,
                userId
            );
        }

        // Check if base height should be taken from controller
        if (!this.config.baseHeight) {
            const resp = await DPGService.dpgCommand(
                this.config,
                this.characteristics,
                DPGService.DPG.CMD_BASE_OFFSET
            );
            debugLog(this.config, "baseHeight resp:", resp);
            if (resp) {
                // unsigned short integer in little-endian byte order
                const baseHeight = resp.subarray(1).readUInt16LE(0) / 10;
                console.log(
                    `Base height from desk: ${baseHeight.toFixed(0)}mm`
                );
                this.config.baseHeight = baseHeight;
            }
        }
        if (!this.config.maxHeight) {
            this.config.maxHeight = this.config.baseHeight + 10;
        }
    }

    private async wakeup(): Promise<void> {
        await ControlService.COMMAND.writeCommand(
            this.config,
            this.characteristics,
            ControlService.COMMAND.CMD_WAKEUP
        );
    }

    public async moveTo(target: Height): Promise<void> {
        debugLog(this.config, "move_to - enter");

        const heightAndSpeed = await ReferenceOutputService.getHeightSpeed(
            this.characteristics,
            this.config
        );
        if (heightAndSpeed.height.value === target.value) {
            return;
        }

        debugLog(this.config, "move_to - got initial height");

        await this.wakeup();
        debugLog(this.config, "move_to - done wakeup");
        await this.stop();
        debugLog(this.config, "move_to - done stop");

        if (target.value < heightAndSpeed.height.value) {
            // first move up - prevents desk getting stuck:
            await this.stepUpwards();
        }

        const thevalue = target.value;
        debugLog(this.config, "move_to - thevalue is", thevalue);
        const data = ReferenceInputService.encodeHeight(thevalue);
        debugLog(this.config, "move_to - target data is", data);

        while (true) {
            debugLog(this.config, "move_to - top of loop");
            await ReferenceInputService.ONE.write(
                this.config,
                this.characteristics,
                data
            );
            await sleep(this.config.moveCommandPeriod * 1000);
            const heightAndSpeedUpdated =
                await ReferenceOutputService.getHeightSpeed(
                    this.characteristics,
                    this.config
                );
            if (heightAndSpeedUpdated.speed.value === 0) {
                break;
            }
            console.log(
                `Height: ${heightAndSpeedUpdated.height.human.toFixed(
                    0
                )}mm Speed: ${heightAndSpeedUpdated.speed.human.toFixed(0)}mm/s`
            );
        }
    }

    public async stepUpwards(): Promise<void> {
        const data = ReferenceInputService.encodeHeight(
            new Height(this.config.maxHeight, this.config, true).value
        );
        debugLog(this.config, "stepUpwards - target data is", data);

        await ReferenceInputService.ONE.write(
            this.config,
            this.characteristics,
            data
        );
        await sleep(this.config.moveCommandPeriod * 1000);

        await sleep(3000);
    }

    public async getHeightSpeed(): Promise<HeightAndSpeed> {
        return await ReferenceOutputService.getHeightSpeed(
            this.characteristics,
            this.config
        );
    }

    public async watchHeightSpeed(
        callback?: (heightAndSpeed: HeightAndSpeed) => void
    ): Promise<void> {
        // Listen for height changes

        const rawCallback = (data: Buffer) => {
            const heightAndSpeed = ReferenceOutputService.decodeHeightSpeed(
                data,
                this.config
            );
            console.log(
                `Height: ${heightAndSpeed.height.human.toFixed(
                    0
                )}mm Speed: ${heightAndSpeed.speed.human.toFixed(0)}mm/s`
            );

            if (callback) {
                callback(heightAndSpeed);
            }
        };

        await ReferenceOutputService.ONE.subscribe(
            this.config,
            this.characteristics,
            rawCallback
        );
        await new Promise(() => {}); // Use a dummy promise to keep the function running
    }

    private async stop(): Promise<void> {
        try {
            await ControlService.COMMAND.writeCommand(
                this.config,
                this.characteristics,
                ControlService.COMMAND.CMD_STOP
            );
        } catch (e) {
            console.error("todo handle", e);
            /*if (!(e instanceof BleakDBusError)) {
                throw e;
            }*/
            // Harmless exception that happens on Raspberry Pis
            // bleak.exc.BleakDBusError: [org.bluez.Error.NotPermitted] Write acquired
        }
    }

    private static decodeCapabilities(
        caps: Buffer | null,
        config: Config
    ): Capabilities | null {
        if (!caps || caps.length < 2) {
            return null;
        }

        debugLog(config, "caps", caps);
        const capByte = caps[0];
        debugLog(config, "capByte", capByte);
        const refByte = caps[1];
        debugLog(config, "refByte", refByte);

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
