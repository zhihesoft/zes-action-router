export interface MessageRoutingOption {
    verb?: "GET" | "POST" | "ANY";
    security?: boolean;
}