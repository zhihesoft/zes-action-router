import { InjectionToken } from "tsyringe";
import { ActionRoutingOption } from "./action.routing.option.mjs";

/**
 * Action Routing
 */
export interface ActionRouting {
    path: string;
    token: InjectionToken | ActionRouting[];
    option?: ActionRoutingOption;
}
