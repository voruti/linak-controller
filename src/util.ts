// Random helpers and util.

const baseHeight: number = 640; // TODO: replace with dynamically

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
