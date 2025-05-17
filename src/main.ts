import noble, { type Peripheral } from "@abandonware/noble";
import consoleStamp from "console-stamp";
import express, { type Express } from "express";

import { Config } from "./config";
import { Desk } from "./desk";
import { RestApi } from "./restapi";
import { debugLog } from "./util";

class Main {
    private readonly config: Config;

    private deskPeripheral?: Peripheral;

    private async disconnect(
        doPeripheralDisconnect: boolean = true
    ): Promise<void> {
        this.deskPeripheral?.removeAllListeners();
        noble.removeAllListeners();

        if (doPeripheralDisconnect) {
            await this.deskPeripheral?.disconnectAsync();
        }

        process.exit(0);
    }

    private async connect(): Promise<Peripheral> {
        console.log(
            "Trying to connect to",
            this.config.macAddress.toUpperCase()
        );

        // make variables accessible:
        const _this = this;

        async function stateChangeCallback(state: string) {
            debugLog(_this.config, "state", state);

            if (state === "poweredOn") {
                noble.removeListener("stateChange", stateChangeCallback);
                await noble.startScanningAsync();
            }
        }
        noble.on("stateChange", stateChangeCallback);

        return await new Promise((resolve) => {
            async function discoverCallback(peripheral: Peripheral) {
                debugLog(_this.config, "peripheral", peripheral);

                if (peripheral.address === _this.config.macAddress) {
                    console.log("Found MAC address");

                    noble.removeListener("discover", discoverCallback);
                    await noble.stopScanningAsync();

                    // handle loosing connection:
                    peripheral.on("disconnect", () => {
                        console.log("Lost connection with desk");

                        _this.disconnect(false);
                    });

                    console.log("Starting connection");
                    await peripheral.connectAsync();
                    console.log("Connected");

                    resolve(peripheral);
                }
            }
            noble.on("discover", discoverCallback);
        });
    }

    private async runServer(desk: Desk): Promise<void> {
        const app: Express = express();

        new RestApi(this.config, app, desk);

        app.listen(this.config.serverPort, this.config.serverAddress, () => {
            console.log("Server listening on port", this.config.serverPort);
        });

        await new Promise<void>((resolve) => {
            app.once("close", resolve);
        });
    }

    private async main(): Promise<void> {
        try {
            consoleStamp(console);

            this.deskPeripheral = await this.connect();
            if (this.deskPeripheral) {
                const { characteristics } =
                    await this.deskPeripheral.discoverAllServicesAndCharacteristicsAsync();

                const desk: Desk = new Desk(characteristics, this.config);
                await desk.initialize();
                await this.runServer(desk);

                // ---- in theory this line is never crossed ----

                await this.disconnect(true);
            }

            this.disconnect(false);
        } catch (e) {
            console.error("Something unexpected happened:", e);
            process.exit(1);
        }
    }

    constructor() {
        this.config = new Config();

        this.main();
    }
}

new Main();
