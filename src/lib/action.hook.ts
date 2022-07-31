import { ActionRoutingOption } from "./action.routing.option";

export enum ActionHookType {
    before,
    after,
}

export interface ActionHook {
    hook(path: string, option: ActionRoutingOption | undefined, args: unknown): unknown;
}