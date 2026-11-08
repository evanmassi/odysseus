export const createId = (): string => crypto.randomUUID().slice(0, 8);
