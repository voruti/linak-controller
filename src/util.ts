// Random helpers and util.

const baseHeight: number = 640; // TODO: replace with dynamically

export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ");
}

export function hexToBytes(hex: string): Uint8Array {
    const hexWithoutSpaces = hex.replace(/\s/g, "");
    if (hexWithoutSpaces.length % 2 !== 0) {
        throw new Error("Invalid hex input");
    }

    const byteCount = hexWithoutSpaces.length / 2;
    const byteArray = new Uint8Array(byteCount);

    for (let i = 0; i < byteCount; ++i) {
        byteArray[i] = parseInt(
            hexWithoutSpaces.substring(i * 2, (i + 1) * 2),
            16
        );
    }

    return byteArray;
}

export function bytesToInt(bytes: Uint8Array): number {
    return bytes.reduceRight((acc, byte) => (acc << 8) | byte, 0);
}

export function bytesToUtf8(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

export function uuidsMatch(uuid1?:string|null,uuid2?:string|null):boolean{
    return uuid1?.toLowerCase()?.replaceAll("-","") === uuid2?.toLowerCase()?.replaceAll("-","")
}

class AsyncQueue<T> {
    private queue: Array<{
        resolve: (value: T) => void;
        reject: (error: any) => void;
    }> = [];

    put(value: T): void {
        const item = this.queue.shift();
        if (item) {
            item.resolve(value);
        }
    }

    async get(): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ resolve, reject });
        });
    }
}

export function makeIter<T>() {
    const queue = new AsyncQueue<T>();

    function put(...args: T[]): void {
        if (args.length === 1) {
            queue.put(args[0]);
        } else {
            // Handle the case where more than one argument is provided.
            throw new Error("Invalid number of arguments provided to put");
        }
    }

    async function* get(): AsyncGenerator<T, void, unknown> {
        while (true) {
            yield await queue.get();
        }
    }

    return [get(), put];
}

export class Height {
    private _value: number;

    constructor(height: number, convertFromHuman: boolean = false) {
        if (convertFromHuman) {
            this._value = Height.heightToInternalHeight(height);
        } else {
            this._value = height; // relative height in 10ths of a mm
        }
    }

    public get value(): number {
        return this._value;
    }

    public get human(): number {
        return Height.internalHeightToHeight(this.value);
    }

    public static heightToInternalHeight(height: number): number {
        return (height - baseHeight) * 10;
    }

    public static internalHeightToHeight(height: number): number {
        return height / 10 + baseHeight;
    }
}

export class Speed {
    private _value: number;

    constructor(speed: number, convert: boolean = false) {
        if (convert) {
            this._value = Speed.speedToInternalSpeed(speed);
        } else {
            this._value = speed; // speed in 100ths of a mm/s
        }
    }

    public get value(): number {
        return this._value;
    }

    public get human(): number {
        return Speed.internalSpeedToSpeed(this.value);
    }

    public static speedToInternalSpeed(speed: number): number {
        return speed * 100;
    }

    public static internalSpeedToSpeed(speed: number): number {
        return speed / 100;
    }
}
