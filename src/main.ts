import * as os from 'os';
import * as util from 'util';
import * as http from 'http';
import * as express from 'express';
import  * as noble from '@abandonware/noble';
import { Height ,uuidsMatch,sleep, HeightAndSpeed} from './util';
import { Desk } from './desk';
import { Config } from './config';

const app = express();
const server = http.createServer(app);

let services: noble.Service[] | undefined;
let characteristics: noble.Characteristic[] | undefined

async function scan(): Promise<void> {
    console.log("entering scan() function");
    noble.on('stateChange', (state)=>{
        console.log("state",state);

        if (state === "poweredOn") {
            noble.on('discover', (peripheral)=>{
                console.log("peripheral",peripheral)
            });

            noble.startScanningAsync();
        }
    });
    /*const devices =  await noble.startScanningAsync();*/
    /*console.log(`Found ${devices.length} devices using ${config.adapterName}`);
    for (const device of devices) {
        console.log(device);
    }*/
}
/*
function disconnectCallback(client: BleakClient, _?: any): void {
    if (!config.disconnecting) {
        console.log(`Lost connection with ${client.address}`);
        connect(client);
    }
}
*/
async function connect(config:Config/*client?: BleakClient, attempt: number = 0*/): Promise<noble.Peripheral> {
    console.log("Trying to connect to", config.macAddress)

    async function stateChangeCallback  (state:string) {
        console.log("state",state);

        if (state === 'poweredOn') {
            noble.removeListener("stateChange", stateChangeCallback)
            await noble.startScanningAsync();
        }
    };
    noble.on('stateChange', stateChangeCallback);
    
    return new Promise((resolve)=>{
        async function discoverCallback  (peripheral:noble.Peripheral) {
            console.log("peripheral",peripheral)

            if (peripheral.address === config.macAddress) {
                console.log("found mac address")

                noble.removeListener("discover",discoverCallback);
                await noble.stopScanningAsync();

                console.log("Starting connection")
                await peripheral.connectAsync();
                console.log("Connected")

                const servicesAndCharacteristics = await peripheral.discoverAllServicesAndCharacteristicsAsync();
                //console.log("servicesAndCharacteristics",servicesAndCharacteristics)

                services = servicesAndCharacteristics.services;
                characteristics = servicesAndCharacteristics.characteristics;

                await Desk.initialize(characteristics,config);

                resolve(peripheral);
            }
        };
        noble.on('discover', discoverCallback);
    });

    /*try {
        console.log("Connecting\r");
        if (!client) {
            client = new BleakClient(
                config.macAddress,
                { device: config.adapterName, disconnectedCallback: disconnectCallback }
            );
        }
        await client.connect({ timeout: config.connectionTimeout });
        console.log(`Connected ${config.macAddress}`);

        await Desk.initialize(client);

        return client;
    } catch (e) {
        if (e instanceof BleakError) {
            console.log("Connecting failed");
            if (e.message.includes("was not found")) {
                console.log(e.message);
            } else {
                console.log(traceback.formatException(e));
            }
            os.exit(1);
        } else if (e instanceof util.TimeoutError) {
            console.log("Connecting failed - timed out");
            os.exit(1);
        } else if (e instanceof Error) {
            console.log(e.message);
            os.exit(1);
        }
    }*/
}
/*
async function disconnect(client: BleakClient): Promise<void> {
    if (client.isConnected) {
        config.disconnecting = true;
        await client.disconnect();
    }
}

async function runCommand(client: BleakClient): Promise<void> {
    const [initialHeight, _] = await Desk.getHeightSpeed(client);
    config.log(`Height: ${initialHeight.human}mm`);
    let target: Height | null = null;
    if (config.command === Commands.watch) {
        config.log("Watching for changes to desk height and speed");
        await Desk.watchHeightSpeed(client);
    } else if (config.command === Commands.moveTo) {
        if (config.moveTo in config.favourites) {
            target = new Height(config.favourites[config.moveTo], true);
            config.log(`Moving to favourite height: ${config.moveTo} (${target.human} mm)`);
        } else if (Number.isInteger(Number(config.moveTo))) {
            target = new Height(Number(config.moveTo), true);
            config.log(`Moving to height: ${config.moveTo}`);
        } else {
            config.log(`Not a valid height or favourite position: ${config.moveTo}`);
            return;
        }
        if (target.value === initialHeight.value) {
            config.log("Nothing to do - already at specified height");
            return;
        }
        await Desk.moveTo(client, target);
    }
    if (target) {
        const [finalHeight, _] = await Desk.getHeightSpeed(client);
        config.log(`Final height: ${finalHeight.human}mm (Target: ${target.human}mm)`);
    }
}
async function runTcpServer(client: BleakClient): Promise<void> {
    const tcpServer = new WebSocket.Server({ server });
    tcpServer.on('connection', (socket) => {
        runTcpForwardedCommand(client, socket);
    });

    console.log("TCP Server listening");
}

function runTcpForwardedCommand(client: BleakClient, socket: WebSocket): void {
    console.log("Received command");
    socket.on('message', async (data) => {
        const request = data.toString('utf8');
        const forwardedConfig = JSON.parse(request);
        for (const key in forwardedConfig) {
            if (Object.prototype.hasOwnProperty.call(forwardedConfig, key)) {
                config[key] = forwardedConfig[key];
            }
        }
        await runCommand(client);
        socket.close();
    });
}

async function runServer(client: BleakClient): Promise<void> {
    app.post('/', (req, res) => runForwardedCommand(client, req, res));
    wss.on('connection', (socket) => runForwardedWsCommand(client, socket));

    server.listen(config.serverPort, config.serverAddress, () => {
        console.log("Server listening");
    });

    await new Promise((resolve) => {
        server.on('close', resolve);
    });
}

async function runForwardedCommand(client: BleakClient, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    console.log("Received command");

    const data: Buffer[] = [];
    req.on('data', (chunk) => {
        data.push(chunk);
    });

    req.on('end', async () => {
        const forwardedConfig = JSON.parse(Buffer.concat(data).toString('utf8'));
        for (const key in forwardedConfig) {
            if (Object.prototype.hasOwnProperty.call(forwardedConfig, key)) {
                config[key] = forwardedConfig[key];
            }
        }
        await runCommand(client);
        res.end("OK");
    });
}

async function runForwardedWsCommand(client: BleakClient, socket: WebSocket): Promise<void> {
    console.log("Received ws command");

    const log = (message: string, end: string = "\n"): void => {
        console.log(message, end);
        socket.send(message);
    };

    config.log = log;

    socket.on('message', async (data) => {
        const forwardedConfig = JSON.parse(data.toString('utf8'));
        for (const key in forwardedConfig) {
            if (Object.prototype.hasOwnProperty.call(forwardedConfig, key)) {
                config[key] = forwardedConfig[key];
            }
        }
        await runCommand(client);
        socket.close();
    });

    await new Promise((resolve) => {
        socket.on('close', resolve);
    });
}

async function forwardCommand(): Promise<void> {
    const allowedCommands = [null, Commands.moveTo];
    if (!allowedCommands.includes(config.command)) {
        console.log(`Command must be one of ${allowedCommands}`);
        return;
    }
    const configDict = config as Record<string, any>;
    const allowedKeys = ["command", "moveTo"];
    const forwardedConfig: Record<string, any> = {};
    for (const key of allowedKeys) {
        if (key in configDict) {
            forwardedConfig[key] = configDict[key];
        }
    }

    const ws = new WebSocket(`ws://${config.serverAddress}:${config.serverPort}/ws`);
    ws.on('open', () => {
        ws.send(JSON.stringify(forwardedConfig));
    });

    ws.on('message', (data) => {
        console.log(data);
    });

    await new Promise((resolve) => {
        ws.on('close', resolve);
    });
}
*/
async function main(): Promise<void> {
    try {
        const config = new Config();

        let peripheral: noble.Peripheral | null = null;

        /*if (config.forward) {
            await forwardCommand();
        } else if (config.command === Commands.scanAdapter) {
            await scan();
        } else {*/
            peripheral = await connect(config);

            if (characteristics) {
                /*await Desk.getHeightSpeed(characteristics,config).then((heightAndSpeed:HeightAndSpeed)=>{
                    console.log(`Height: ${heightAndSpeed.height.human.toFixed(0)}mm Speed: ${heightAndSpeed.speed.human.toFixed(0)}mm/s`);
                });*/
                //await Desk.moveTo(characteristics,new Height(1151,config,true),config);
                await Desk.stop(characteristics);
            }

            await peripheral.disconnectAsync();

            /*if (config.command === Commands.server) {
                await runServer(client);
            } else if (config.command === Commands.tcpServer) {
                await runTcpServer(client);
            } else {
                await runCommand(client);
            }
        }*/
    } catch (e) {
        console.error("Something unexpected happened:",e);
    } /*finally {
        if (client) {
            console.log("\rDisconnecting\r");
            await Desk.stop(client);
            await disconnect(client);
            console.log("Disconnected         ");
        }
    }*/

    console.log("End");
    process.exit(0);
}

main();
