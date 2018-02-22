import {ConditionalRedis} from "./conditional-redis";
import * as thenRedis from 'then-redis'
import { createClient, Client } from 'then-redis'
import createSpy = jasmine.createSpy;
import {JsonLogger} from "./json-logger";

describe('Class: ConditionalRedis', () => {
    beforeEach(() => {
        delete process.env.REDIS_URL;
    });
    it('does not use redis if the environment variable REDIS_URL is not set', () => {
        const unitUnderTest = new ConditionalRedis();
        expect(unitUnderTest.redis).toBeUndefined();
    });

    it('creates a new RedisClient if it is set', () => {
        process.env.REDIS_URL = 'tcp://localhost:12345';
        spyOn(thenRedis, 'createClient')
            .and
            .returnValue({
                on:() => {},
                get:() => {},
                setex:() => {},
            });

        new ConditionalRedis();

        expect(thenRedis.createClient).toHaveBeenCalled();
    });

    it('logs a JsonLogger message if redis throws an error', () => {
        process.env.REDIS_URL = 'tcp://localhost:12345';
        let errorCb = (x:any)=>fail(`should have been logged: ${x}`);
        spyOn(thenRedis, 'createClient')
            .and
            .returnValue({
                on:(what,cb) => {
                    if (what === 'error') errorCb = cb;
                },
                get:() => {},
                setex:() => {},
            });
        spyOn(JsonLogger, 'log')
            .and.stub();

        new ConditionalRedis();
        const expectedError = 'expected error';
        errorCb(expectedError);

        expect(JsonLogger.log).toHaveBeenCalledWith('error', {component: 'redis', error: expectedError})
    });

    describe('Function: getOrFetch', () => {
        describe('with un-configured redis url', () => {
            it('calls the promiseFunction', async () => {
                delete process.env.REDIS_URL;
                const spy = createSpy('promiseFunction', (): Promise<string> => Promise.resolve('ok'))
                    .and
                    .callThrough();
                const unitUnderTest = new ConditionalRedis();
                await unitUnderTest.getOrFetch('key', 1, spy, (s) => s);
                expect(spy).toHaveBeenCalled();
            });
        });
        describe('with configured redis url', () => {
            beforeEach(() => {
                process.env.REDIS_URL = 'tcp://localhost:12345';
                spyOn(ConditionalRedis, 'createClient')
                    .and
                    .returnValue({
                        on:() => {},
                        get:() => {},
                        setex:() => {},
                    });
            });

            afterEach(() => {
                delete process.env.REDIS_URL;
            });

            it('calls redis.get with the key', async () => {
                const expectedKey = 'expected-key';
                const unitUnderTest = new ConditionalRedis();
                spyOn(unitUnderTest.redis, 'get')
                    .and
                    .returnValue(Promise.resolve(null));
                spyOn(unitUnderTest.redis, 'setex')
                    .and
                    .returnValue(Promise.resolve(null));
                await unitUnderTest.getOrFetch(expectedKey,
                    1,
                    (): Promise<string> => Promise.resolve('ok'),
                    (s) => s);
                expect(unitUnderTest.redis.get).toHaveBeenCalledWith(expectedKey);
            });

            it('uses the restore function redis.get response for the key if not null', async () => {
                const expectedKey = 'expected-key';
                const expectedRedisResponse = {redis:'response'};
                const expectedPromiseResponse = {promise: 'response'};
                const redisStringResponse = JSON.stringify(expectedRedisResponse);

                const spy = createSpy('restoreFunction', s => JSON.parse(s))
                    .and
                    .callThrough();

                const unitUnderTest = new ConditionalRedis();

                spyOn(unitUnderTest.redis, 'get')
                    .and
                    .returnValue(Promise.resolve(redisStringResponse));

                expect(await unitUnderTest.getOrFetch<any>(expectedKey,
                    1,
                    (): Promise<any> => Promise.resolve(expectedPromiseResponse),
                    spy)).toEqual(expectedRedisResponse);

                expect(spy).toHaveBeenCalledWith(redisStringResponse);
            });

            it('returns the promiseFunction if the redis.get response for the key is null', async () => {
                const expectedKey = 'expected-key';
                const expectedPromiseResponse = {promise: 'response'};
                const unitUnderTest = new ConditionalRedis();

                spyOn(unitUnderTest.redis, 'get')
                    .and
                    .returnValue(Promise.resolve(null));
                spyOn(unitUnderTest.redis, 'setex')
                    .and
                    .returnValue(Promise.resolve(null));
                expect(await unitUnderTest.getOrFetch<any>(expectedKey, 1, (): Promise<any> => Promise.resolve(expectedPromiseResponse), JSON.parse)).toEqual(expectedPromiseResponse);
            });

            it('returns the promiseFunction if the restoreFunction response for the key is null', async () => {
                const expectedKey = 'expected-key';
                const expectedPromiseResponse = {promise: 'response'};
                const unitUnderTest = new ConditionalRedis();

                spyOn(unitUnderTest.redis, 'get')
                    .and
                    .returnValue(Promise.resolve('some string'));
                spyOn(unitUnderTest.redis, 'setex')
                    .and
                    .returnValue(Promise.resolve(null));
                const spy = createSpy('promiseFunction', (): Promise<any> => Promise.resolve(expectedPromiseResponse))
                    .and
                    .callThrough();
                expect(await unitUnderTest.getOrFetch<any>(expectedKey, 1, spy, () => null)).toEqual(expectedPromiseResponse);
                expect(spy).toHaveBeenCalled();
            });

            describe('with result not from the cache', () => {
                it('calls redis.setex with the key, expiration and promise response', async () => {
                    const expectedKey = 'expected-key';
                    const expectedPromiseResponse = {promise: 'response'};
                    const unitUnderTest = new ConditionalRedis();

                    spyOn(unitUnderTest.redis, 'get')
                        .and
                        .returnValue(Promise.resolve(null));
                    spyOn(unitUnderTest.redis, 'setex')
                        .and
                        .returnValue(Promise.resolve(null));

                    await unitUnderTest.getOrFetch<any>(expectedKey, 1, (): Promise<any> => Promise.resolve(expectedPromiseResponse), JSON.parse);
                    expect(unitUnderTest.redis.setex).toHaveBeenCalledWith(expectedKey, 1, JSON.stringify(expectedPromiseResponse));
                });
                it('rejects if the redis.setex call fails', async () => {
                    const expectedKey = 'expected-key';
                    const expectedPromiseResponse = {promise: 'response'};
                    const unitUnderTest = new ConditionalRedis();
                    const expectedError = 'expected error';

                    spyOn(unitUnderTest.redis, 'get')
                        .and
                        .returnValue(Promise.resolve(null));
                    spyOn(unitUnderTest.redis, 'setex')
                        .and
                        .returnValue(Promise.reject(expectedError));

                    try {
                        await unitUnderTest.getOrFetch<any>(expectedKey, 1, (): Promise<any> => Promise.resolve(expectedPromiseResponse), JSON.parse);
                        fail('expected to throw')
                    } catch (e) {
                        expect(e).toBe(expectedError);
                    }
                });
            });
        });
    });

    describe('Function: set', () => {
        describe('with un-configured redis url', () => {
            it('returns a resolved Promise', async () => {
                delete process.env.REDIS_URL;
                const unitUnderTest = new ConditionalRedis();
                await unitUnderTest.set('key', 'value');
            });
        });
        describe('with configured redis url', () => {
            beforeEach(() => {
                process.env.REDIS_URL = 'tcp://localhost:12345';
                spyOn(ConditionalRedis, 'createClient')
                    .and
                    .returnValue({
                        on:() => {},
                        get:() => {},
                        set:() => {},
                        setex:() => {},
                    });
            });

            afterEach(() => {
                delete process.env.REDIS_URL;
            });

            it('calls redis.set with key and a JSON string of value', async () => {
                const expectedKey = 'expected key';
                const value = {some: 'content', is: 1, within: {the: 'object'}};
                const expectedJsonValue = JSON.stringify(value);

                const unitUnderTest = new ConditionalRedis();
                const spy = spyOn(unitUnderTest.redis, 'set')
                    .and
                    .returnValues(Promise.resolve());
                await unitUnderTest.set(expectedKey, value);
                expect(spy).toHaveBeenCalledWith(expectedKey, expectedJsonValue);
            });
        });
    });

    describe('Function: get', () => {

        describe('with un-configured redis url', () => {
            it('returns the fallback value', async () => {
                const expectedResult = 'fallback value';
                delete process.env.REDIS_URL;
                const unitUnderTest = new ConditionalRedis();
                const actualResult = await unitUnderTest.get('key', expectedResult, undefined);
                expect(actualResult).toBe(expectedResult);
            });
        });

        describe('with configured redis url', () => {
            beforeEach(() => {
                process.env.REDIS_URL = 'tcp://localhost:12345';
                spyOn(ConditionalRedis, 'createClient')
                    .and
                    .returnValue({
                        on:() => {},
                        get:() => {},
                        set:() => {},
                        setex:() => {},
                    });
            });

            afterEach(() => {
                delete process.env.REDIS_URL;
            });

            it('calls redis.get with the key', async () => {
                const expectedKey = 'expected key';

                const unitUnderTest = new ConditionalRedis();
                const spy = spyOn(unitUnderTest.redis, 'get')
                    .and
                    .returnValues(Promise.resolve());
                await unitUnderTest.get(expectedKey, undefined, s=>s);
                expect(spy).toHaveBeenCalledWith(expectedKey);
            });

            it('uses the restore function on the redis.get result', async () => {
                const expectedKey = 'expected key';
                const redistGetResponse = '{"some":"json"}';
                const spy = createSpy('restoreFunction', (s: string) => JSON.parse(s))
                    .and
                    .callThrough();
                const unitUnderTest = new ConditionalRedis();
                spyOn(unitUnderTest.redis, 'get')
                    .and
                    .returnValues(Promise.resolve(redistGetResponse));
                await unitUnderTest.get(expectedKey, undefined, spy);
                expect(spy).toHaveBeenCalledWith(redistGetResponse);
            });

            it('returns the fallbackValue if the redis.get result is null', async () => {
                const expectedKey = 'expected key';
                const fallbackValue = {"fallback":"value"};
                const unitUnderTest = new ConditionalRedis();
                spyOn(unitUnderTest.redis, 'get')
                    .and
                    .returnValues(Promise.resolve(null));
                const actualResult = await unitUnderTest.get(expectedKey, fallbackValue, undefined);
                expect(actualResult).toBe(fallbackValue);
            });

            it('returns the fallbackValue if the restoreFunction result is null', async () => {
                const expectedKey = 'expected key';
                const fallbackValue = {"fallback":"value"};
                const unitUnderTest = new ConditionalRedis();
                spyOn(unitUnderTest.redis, 'get')
                    .and
                    .returnValues(Promise.resolve('some data'));
                const actualResult = await unitUnderTest.get(expectedKey, fallbackValue, ()=>null);
                expect(actualResult).toBe(fallbackValue);
            });
        });
    });

    describe('Function: setex', () => {
        describe('with un-configured redis url', () => {
            it('returns a resolved Promise', async () => {
                delete process.env.REDIS_URL;
                const unitUnderTest = new ConditionalRedis();
                await unitUnderTest.setex('key', 1, 'value');
            });
        });
        describe('with configured redis url', () => {
            beforeEach(() => {
                process.env.REDIS_URL = 'tcp://localhost:12345';
                spyOn(ConditionalRedis, 'createClient')
                    .and
                    .returnValue({
                        on:() => {},
                        get:() => {},
                        set:() => {},
                        setex:() => {},
                    });
            });

            afterEach(() => {
                delete process.env.REDIS_URL;
            });

            it('calls redis.setex with key, expiration, and a JSON string of value', async () => {
                const expectedKey = 'expected key';
                const expiration = 123;
                const value = {some: 'content', is: 1, within: {the: 'object'}};
                const expectedJsonValue = JSON.stringify(value);

                const unitUnderTest = new ConditionalRedis();
                const spy = spyOn(unitUnderTest.redis, 'setex')
                    .and
                    .returnValues(Promise.resolve());
                await unitUnderTest.setex(expectedKey, expiration, value);
                expect(spy).toHaveBeenCalledWith(expectedKey, expiration, expectedJsonValue);
            });
        });
    });
});
