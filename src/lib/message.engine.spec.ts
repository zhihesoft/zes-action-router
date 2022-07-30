import { assert } from "chai";
import { injectable } from "tsyringe";
import { MessageEngine } from "./message.engine";
import { MessageProcessor } from "./message.processor";
import { MessageRouting } from "./message.routing";

@injectable()
class TestProcess implements MessageProcessor {
    async process(message: string): Promise<string> {
        return message;
    }
}

@injectable()
class TestProcess2 implements MessageProcessor {
    async process(test: string): Promise<string> {
        return test;
    }
}

const testRouter: MessageRouting[] = [
    { path: "one", token: TestProcess, option: { security: false } },
    { path: "two", token: TestProcess },
    { path: "three", token: TestProcess },
    {
        path: "fold", token: [
            { path: "one", token: TestProcess },
            { path: "two", token: TestProcess2, option: { security: false } },
            { path: "three", token: TestProcess },
        ]
    }
]

const engine: MessageEngine = new MessageEngine(testRouter);

describe(`message.engine`, () => {

    before(() => {
        engine.registerArgument("test", () => "test");
    });

    it(`get all path should return 6`, async () => {
        assert.equal(engine?.getPaths().length, 6);
    });
    it(`insecurity path should be 2`, async () => {
        assert.equal(engine?.getInsecurityPaths().length, 2);
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
    it(`process should return test for {message:"succ"}`, async () => {
        const ret = await engine.process("/fold/two", { message: "succ" });
        assert.equal(ret, "test");
    });

});
