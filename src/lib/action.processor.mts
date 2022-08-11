/**
 * Message processor
 */
export interface ActionProcessor {
    process(...args: unknown[]): Promise<unknown>;
}
