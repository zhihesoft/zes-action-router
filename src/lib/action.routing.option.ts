/**
 * Action Routing Options
 */
export interface ActionRoutingOption {
    verb?: "GET" | "POST" | "ANY";
    security?: boolean;
}