import "reflect-metadata";
import log4js from "log4js";
import { assert } from "chai";
import { injectable } from "tsyringe";
import { ActionRouter } from "../lib/action.router";
import { ActionProcessor } from "../lib/action.processor";
import { ActionRouting } from "../lib/action.routing";
import { ActionHook, ActionHookContext, ActionHookType } from "../lib/action.hook";
import { getLogger } from "log4js";

log4js.configure("./log4js-test.json");

@injectable()
class TestProcess implements ActionProcessor {
    async process(message: string): Promise<string> {
        return message;
    }
}

@injectable()
class TestProcess2 implements ActionProcessor {
    async process(test: string): Promise<string> {
        return test;
    }
}

class TestBeforeHook implements ActionHook {
    hook(context: ActionHookContext, args: unknown): unknown {
        return Object.assign(<object>args, { test: "hello" });
    }

}

const testRouter: ActionRouting[] = [
    { path: "one", token: TestProcess, option: { security: false } },
    { path: "two", token: TestProcess },
    { path: "three", token: TestProcess },
    {
        path: "fold", token: [
            { path: "one", token: TestProcess },
            { path: "two", token: TestProcess2, option: { security: false } },
            { path: "three", token: TestProcess },
        ]
    },
    {
        path: "fold/fold", token: [
            { path: "one", token: TestProcess },
            { path: "two", token: TestProcess2, option: { security: false } },
            { path: "three", token: TestProcess },
        ]
    },
];


const engine: ActionRouter = new ActionRouter(testRouter);

describe(`zes_action_router test suit`, () => {
    before(() => {
        engine.hook(ActionHookType.before, new TestBeforeHook());
    });

    it(`get all path should return 9`, async () => {
        getLogger("test").info(`all path: ${engine.getPaths()}`);
        assert.equal(engine?.getPaths().length, 9);
    });
    it(`insecurity path should be 3`, async () => {
        assert.equal(engine?.getInsecurityPaths().length, 3);
    });
    it(`/fold/two should be insecurity`, async () => {
        assert(engine.getInsecurityPaths().indexOf("/fold/two") >= 0, JSON.stringify(engine.getInsecurityPaths()));
    });
    it(`process should return succ for {message: "succ"}`, async () => {
        const ret = await engine.process("/fold/one", { message: "succ" });
        assert.equal(ret, "succ");
    });
    it(`process should return undefined for {message1: "succ"}`, async () => {
        const ret = await engine.process("/fold/three", { message1: "succ" });
        assert.isUndefined(ret);
    });
    it(`process should return hello for {message:"succ"}`, async () => {
        const ret = await engine.process("/fold/fold/two", { message: "succ" });
        assert.equal(ret, "hello");
    });
});