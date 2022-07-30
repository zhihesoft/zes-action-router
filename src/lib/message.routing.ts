import { InjectionToken } from "tsyringe";
import { MessageRoutingOption } from "./message.routing.option";

export interface MessageRouting {
    path: string;
    token: InjectionToken | MessageRouting[];
    option?: MessageRoutingOption;
}
