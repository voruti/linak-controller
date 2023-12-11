const debounceRunsMap = new Map<string, string>();

export async function debounce(
    identifier: string,
    timeoutMs: number
): Promise<void> {
    const thisRun: string = Math.random().toString(36).substring(2, 9);
    debounceRunsMap.set(identifier, thisRun);

    return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            debounceRunsMap.get(identifier) === thisRun ? resolve() : reject();
        }, timeoutMs);
    });
}
