import express, { Express } from "express";
import  noble from '@abandonware/noble';

import {  debugLog} from './util';
import { Desk } from './desk';
import { Config } from './config';
import { RestApi } from "./restapi";

async function connect(config:Config): Promise<noble.Peripheral> {
    console.log("Trying to connect to", config.macAddress.toUpperCase())

    async function stateChangeCallback  (state:string) {
        debugLog(config,"state",state);

        if (state === 'poweredOn') {
            noble.removeListener("stateChange", stateChangeCallback)
            await noble.startScanningAsync();
        }
    };
    noble.on('stateChange', stateChangeCallback);
    
    return await new Promise((resolve)=>{
        async function discoverCallback  (peripheral:noble.Peripheral) {
            debugLog(config,"peripheral",peripheral)

            if (peripheral.address === config.macAddress) {
                console.log("found mac address")

                noble.removeListener("discover",discoverCallback);
                await noble.stopScanningAsync();

                console.log("Starting connection")
                await peripheral.connectAsync();
                console.log("Connected")

                resolve(peripheral);
            }
        };
        noble.on('discover', discoverCallback);
    });
}

async function runServer(config:Config,characteristics: noble.Characteristic[]): Promise<void> {
    const app :Express = express();

    new RestApi(config,app,characteristics);

    app.listen(config.serverPort, config.serverAddress, () => {
        console.log("Server listening");
    });

    await new Promise<void>((resolve) => {
        app.once('close', resolve);
    });
}


async function main(): Promise<void> {
    try {
        const config = new Config();

        const peripheral: noble.Peripheral  = await connect(config);
        const {characteristics} = await peripheral.discoverAllServicesAndCharacteristicsAsync();

        await Desk.initialize(characteristics,config);
        await runServer(config,characteristics);

        // ---- in theory this line is never crossed ----

        await peripheral.disconnectAsync();
        process.exit(0);
    } catch (e) {
        console.error("Something unexpected happened:",e);
        process.exit(1);
    } 
}

main();
