import { platform } from "os";

export class Config {
    // Config
    macAddress: string = "";
    baseHeight: number = 0;
    adapterName: string = "hci0";
    scanTimeout: number = 5;
    connectionTimeout: number = 10;
    serverAddress: string = "127.0.0.1";
    serverPort: number = 9123;
    moveCommandPeriod: number = 0.4;
    debug: boolean = false;

    constructor() {
        // Overwrite config from environment variables
        this.loadFromEnv();

        if (!this.macAddress) {
            console.error("Mac address must be provided");
        }

        this.macAddress = this.macAddress.trim().toLowerCase();
        this.adapterName = this.adapterName.trim();
        this.serverAddress = this.serverAddress.trim();

        const IS_WINDOWS = platform() === "win32";

        if (IS_WINDOWS) {
            // Windows doesn't use this parameter so rename it so it looks nice for the logs
            this.adapterName = "default adapter";
        }
    }

    private loadFromEnv() {
        // Load values from environment variables, if available
        this.macAddress = process.env.LC_MAC_ADDRESS || this.macAddress;
        this.baseHeight = process.env.LC_BASE_HEIGHT
            ? parseInt(process.env.LC_BASE_HEIGHT)
            : this.baseHeight;
        this.adapterName = process.env.LC_ADAPTER_NAME || this.adapterName;
        this.scanTimeout = process.env.LC_SCAN_TIMEOUT
            ? parseInt(process.env.LC_SCAN_TIMEOUT)
            : this.scanTimeout;
        this.connectionTimeout = process.env.LC_CONNECTION_TIMEOUT
            ? parseInt(process.env.LC_CONNECTION_TIMEOUT)
            : this.connectionTimeout;
        this.serverAddress =
            process.env.LC_SERVER_ADDRESS || this.serverAddress;
        this.serverPort = process.env.LC_SERVER_PORT
            ? parseInt(process.env.LC_SERVER_PORT)
            : this.serverPort;
        this.moveCommandPeriod = process.env.LC_MOVE_COMMAND_PERIOD
            ? parseFloat(process.env.LC_MOVE_COMMAND_PERIOD)
            : this.moveCommandPeriod;
        this.debug = process.env.LC_DEBUG
            ? !["0", "false", "no", "wrong"].includes(
                  process.env.LC_DEBUG.trim().toLowerCase()
              )
            : this.debug;
    }
}
