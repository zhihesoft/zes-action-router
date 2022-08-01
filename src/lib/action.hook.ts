import { ActionRoutingOption } from "./action.routing.option";

export enum ActionHookType {
    before,
    after,
}

export interface ActionHookContext {
    path: string;
    option?: ActionRoutingOption;
}

export interface ActionHook {
    hook(context: ActionHookContext, args: unknown): unknown;
}