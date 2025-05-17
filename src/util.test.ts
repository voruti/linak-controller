import { describe, expect, test } from "@jest/globals";

import { Config } from "./config";
import {
    bytesToHex,
    bytesToInt,
    bytesToUtf8,
    Height,
    hexToBytes,
    Speed,
} from "./util";

describe("util test", () => {
    describe("functions", () => {
        test("bytesToHex and hexToBytes", () => {
            const originalBytes = new Uint8Array([65, 66, 67, 68]);

            const hexString = bytesToHex(originalBytes);
            expect(hexString).toEqual("41 42 43 44");

            if (hexString === "41 42 43 44") {
                const convertedBytes = hexToBytes(hexString);
                expect(convertedBytes).toEqual(originalBytes);
            }
        });

        describe("bytesToInt", () => {
            test("A", () => {
                const bytes = new Uint8Array([0, 1, 0, 0]);
                const result = bytesToInt(bytes);

                expect(result).toBe(256);
            });

            test("B", () => {
                const bytes = new Uint8Array([1, 2, 3, 4]);
                const result = bytesToInt(bytes);

                expect(result).toBe(67305985);
            });
        });

        test("bytesToUtf8", () => {
            const utf8String = "Hello, World!";
            const utf8Bytes = new TextEncoder().encode(utf8String);
            const result = bytesToUtf8(utf8Bytes);

            expect(result).toBe(utf8String);
        });
    });

    describe("classes", () => {
        test("Height Conversion", () => {
            const humanHeight = 760;
            const height = new Height(humanHeight, new Config(), true);

            expect(height.human).toBe(humanHeight);
        });

        test("Speed Conversion", () => {
            const humanSpeed = 50;
            const speed = new Speed(humanSpeed, true);

            expect(speed.human).toBe(humanSpeed);
        });
    });
});
