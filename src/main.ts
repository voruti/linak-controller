import noble, { type Peripheral } from "@stoprocent/noble";
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
    console.log("Trying to connect to", this.config.macAddress.toUpperCase());

    try {
      await noble.waitForPoweredOnAsync();
      await noble.startScanningAsync();

      for await (const peripheral of noble.discoverAsync()) {
        debugLog(this.config, "peripheral", peripheral);

        if (peripheral.address === this.config.macAddress) {
          console.log("Found MAC address");

          await noble.stopScanningAsync();

          // handle loosing connection:
          peripheral.on("disconnect", () => {
            console.log("Lost connection with desk");

            this.disconnect(false);
          });

          console.log("Starting connection");
          await peripheral.connectAsync();
          console.log("Connected");

          return peripheral;
        }
      }

      debugLog(this.config, "after the loop");
      throw new Error("after the loop");
    } catch (error) {
      console.error("Discovery error:", error);
      throw error;
    } finally {
      await noble.stopScanningAsync();
    }
  }

  private async runServer(desk: Desk): Promise<void> {
    const app: Express = express();

    new RestApi(this.config, app, desk).setup();

    app.listen(this.config.serverPort, this.config.serverAddress, () => {
      console.log("Server listening on port", this.config.serverPort);
    });

    await new Promise<void>((resolve) => {
      app.once("close", resolve);
    });
  }

  public async start(): Promise<void> {
    try {
      debugLog(this.config, "Starting connect");
      this.deskPeripheral = await this.connect();
      if (this.deskPeripheral) {
        debugLog(
          this.config,
          "Trying to discoverAllServicesAndCharacteristicsAsync()..."
        );
        const { characteristics } =
          await this.deskPeripheral.discoverAllServicesAndCharacteristicsAsync();
        debugLog(this.config, "Discovered characteristics:", characteristics);

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

    consoleStamp(console);

    debugLog(this.config, "debug logging enabled");
  }
}

new Main().start();
