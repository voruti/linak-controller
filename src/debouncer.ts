import { setTimeout } from "timers/promises";

const debounceRunsMap = new Map<string, string>();

export async function debounce(
    identifier: string,
    timeoutMs: number
): Promise<boolean> {
    const thisRun: string = Math.random().toString(36).substring(2, 9);
    console.log(thisRun);
    debounceRunsMap.set(identifier, thisRun);

    return setTimeout(timeoutMs).then(
        () => debounceRunsMap.get(identifier) === thisRun
    );
}
