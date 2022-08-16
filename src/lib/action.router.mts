import log4js from "log4js";
import { container, InjectionToken } from "tsyringe";
import zes from "zes-util";
import { ActionHook, ActionHookType } from "./action.hook.mjs";
import { ActionProcessor } from "./action.processor.mjs";
import { ActionRouting } from "./action.routing.mjs";
import { ActionRoutingOption } from "./action.routing.option.mjs";

/**
 * Action Router
 */
export class ActionRouter {

    /**
     * Create a new ActionRouter instance
     * @param routings action routings
     */
    constructor(
        routings: ActionRouting[]
    ) {
        if (!routings) {
            throw new Error(`routings cannot be null`);
        }
        routings.forEach(i => this.parseRouting("", i));
    }

    private tokens = new Map<string, { token: InjectionToken; option?: ActionRoutingOption }>();
    private handlers = new Map<string, ActionProcessor>();
    private argumentNames: Map<string, string[]> = new Map();
    private beforeHooks: ActionHook[] = [];
    private afterHooks: ActionHook[] = [];

    /**
     * Add hook to ActionRouter
     * @param type Hook type
     * @param action Hook Action
     */
    public hook(type: ActionHookType, action: ActionHook) {
        if (type == ActionHookType.before) {
            this.beforeHooks.push(action);
        } else {
            this.afterHooks.push(action);
        }
    }

    /**
     * Process message
     * @param path message
     * @param args arguments
     * @returns value
     */
    public async process(path: string, args: unknown): Promise<unknown> {
        let handler = this.handlers.get(path);
        if (!handler) {
            const token = this.tokens.get(path);
            if (!token) {
                const err = new Error(`cannot find handler for path (${path})`);
                logger.error(err.message);
                throw err;
            }
            if (Array.isArray(token.token)) {
                throw new Error(`token cannot be array (${path})`);
            }
            handler = container.resolve(token.token);
            if (!handler) {
                throw new Error(`create handler of ${path} failed`);
            }
            this.handlers.set(path, handler);
        }

        const ps: string[] = this.getArgumentNames(path, handler);
        const option = this.getOption(path);
        args = this.beforeHooks.reduce((now, hook) => hook.hook({ path, option }, now), args);
        const values = ps.map(i => this.getArgumentValue(i, args));
        let ret = await handler.process(...values);
        ret = this.afterHooks.reduce((now, hook) => hook.hook({ path, option }, now), ret);
        return ret;
    }

    /**
     * Return all insecurity paths in router
     * @returns path array
     */
    public getInsecurityPaths(): string[] {
        return Array.from(this.tokens.entries())
            .filter(i => i[1].option && i[1].option.security != undefined && !i[1].option.security)
            .map(i => i[0]);
    }

    /**
     * Return all paths in router
     * @returns path array
     */
    public getPaths() {
        return Array.from(this.tokens.keys());
    }

    /**
     * Get option of spec path
     * @param path path
     * @returns option of this path or undefined if no opt
     */
    public getOption(path: string): ActionRoutingOption | undefined {
        return this.tokens.get(path)?.option;
    }

    private parseRouting(parentPath: string, routing: ActionRouting) {
        let path = routing.path.startsWith("/") ? routing.path.substring(1) : routing.path;
        path = `${parentPath}/${path}`;
        if (Array.isArray(routing.token)) {
            routing.token.forEach(i => this.parseRouting(path, i));
        } else {
            this.tokens.set(path, { token: routing.token, option: routing.option });
        }
    }

    private getArgumentValue(name: string, args: unknown): unknown {
        const data = args as { [name: string]: unknown };
        if (data[name]) {
            return data[name];
        }
        logger.error(`cannot find argument for (${name})`);
        return undefined;
    }

    private getArgumentNames(path: string, processor: ActionProcessor): string[] {
        if (this.argumentNames.has(path)) {
            const ret = this.argumentNames.get(path);
            if (!ret) {
                throw new Error(`invalid names of ${path}`);
            }
            return ret;
        }

        const ps = zes.misc.parseParamNames(processor.process);
        this.argumentNames.set(path, ps);
        return ps;
    }
}

const logger = log4js.getLogger(ActionRouter.name);
