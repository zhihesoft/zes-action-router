import { getLogger } from "log4js";
import { container, InjectionToken } from "tsyringe";
import { ArgumentProvider } from "./argument.provider";
import { ActionProcessor } from "./action.processor";
import { ActionRouting } from "./action.routing";
import { ActionRoutingOption } from "./action.routing.option";

export class ActionEngine {

    constructor(routings: ActionRouting[]) {
        if (!routings) {
            throw new Error(`routings cannot be null`);
        }
        routings.forEach(i => this.parseRouting("", i));
    }

    private tokens = new Map<string, { token: InjectionToken; option?: ActionRoutingOption }>();
    private handlers = new Map<string, ActionProcessor>();
    private argumentProviders: Map<string, ArgumentProvider> = new Map();
    private argumentNames: Map<string, string[]> = new Map();

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

        const ps: string[] = this.getArgumentNames(path, handler?.process.toString());
        const values = ps.map(i => this.getArgumentValue(i, args));
        return handler.process(...values);
    }

    public registerArgument(name: string, provider: ArgumentProvider) {
        this.argumentProviders.set(name, provider);
    }

    public getInsecurityPaths(): string[] {
        return Array.from(this.tokens.entries())
            .filter(i => i[1].option && i[1].option.security != undefined && !i[1].option.security)
            .map(i => i[0]);
    }

    public getPaths() {
        return Array.from(this.tokens.keys());
    }

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
        const data = <{ [name: string]: unknown }>args;
        if (data[name]) {
            return data[name];
        }
        if (this.argumentProviders.has(name)) {
            const fun = this.argumentProviders.get(name);
            if (fun) {
                return fun(args);
            }
        }
        logger.error(`cannot find argument for (${name})`);
        return undefined;
    }

    private getArgumentNames(path: string, fnStr: string): string[] {
        if (this.argumentNames.has(path)) {
            const ret = this.argumentNames.get(path);
            if (!ret) {
                throw new Error(`invalid names of ${path}`);
            }
            return ret;
        }

        const ps = parseParameterNames(fnStr);
        this.argumentNames.set(path, ps);
        return ps;
    }

}

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

function parseParameterNames(fnStr: string) {
    fnStr = fnStr.replace(STRIP_COMMENTS, '');
    const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    return result || [];
}

const logger = getLogger(ActionEngine.name);
