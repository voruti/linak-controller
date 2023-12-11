import express, { Express } from "express";
import noble, { Peripheral } from "@abandonware/noble";

import { debugLog } from "./util";
import { Desk } from "./desk";
import { Config } from "./config";
import { RestApi } from "./restapi";

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
        const config = this.config;
        const disconnect = this.disconnect.bind(this);

        async function stateChangeCallback(state: string) {
            debugLog(config, "state", state);

            if (state === "poweredOn") {
                noble.removeListener("stateChange", stateChangeCallback);
                await noble.startScanningAsync();
            }
        }
        noble.on("stateChange", stateChangeCallback);

        return await new Promise((resolve) => {
            async function discoverCallback(peripheral: Peripheral) {
                debugLog(config, "peripheral", peripheral);

                if (peripheral.address === config.macAddress) {
                    console.log("Found MAC address");

                    noble.removeListener("discover", discoverCallback);
                    await noble.stopScanningAsync();

                    console.log("Starting connection");
                    await peripheral.connectAsync();
                    console.log("Connected");

                    // handle loosing connection:
                    peripheral.on("disconnect", () => {
                        console.log("Lost connection with desk");

                        disconnect(false);
                    });

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
