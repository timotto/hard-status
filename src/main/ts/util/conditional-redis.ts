import * as thenRedis from 'then-redis'
import {Client} from 'then-redis'
import {JsonLogger} from "./json-logger";

export class ConditionalRedis {

    redis: Client | undefined;

    constructor() {
        if (process.env.REDIS_URL !== undefined) {
            this.redis = ConditionalRedis.createClient();
            this.redis.on("error", err => {
                JsonLogger.log('error', {component: 'redis', error: err});
            });
            JsonLogger.log('info', `using redis at ${process.env.REDIS_URL}`);
        } else {
            this.redis = undefined;
        }
    }

    getOrFetch<T>(key: string,
                  expirationSeconds: number,
                  promiseFunction: () => Promise<T>,
                  restoreFunction: (s: string) => T | null): Promise<T> {
        if (this.redis === undefined) {
            return promiseFunction();
        }

        return this.redis.get(key)
            .then(responseString => {
                if (responseString !== null) {
                    const cachedItem = restoreFunction(responseString);
                    if (cachedItem !== null) {
                        return Promise.resolve(cachedItem);
                    }
                }

                return promiseFunction()
                    .then(response => this.redis
                        .setex(key, expirationSeconds, JSON.stringify(response))
                        .then(() => response));
            });
    }

    get<T>(key: string, fallbackValue: T, restoreFunction: (s: string) => T | null): Promise<T|null> {
        if (this.redis === undefined) {
            return Promise.resolve(fallbackValue);
        }
        return this.redis.get(key)
            .then(result => {
                if (result === null) return fallbackValue;
                const restoredResult = restoreFunction(result);
                if (restoredResult === null) {
                    JsonLogger.log('debug',{message:'restoredResult is null', redisResult: result, redisKey: key});
                    return fallbackValue;
                }

                return restoredResult;
            });
    }

    set<T>(key: string, value: T): Promise<any> {
        if (this.redis === undefined) {
            return Promise.resolve();
        }
        return this.redis.set(key, JSON.stringify(value));
    }

    setex<T>(key: string, expiration: number, value: T): Promise<any> {
        if (this.redis === undefined) {
            return Promise.resolve();
        }
        return this.redis.setex(key, expiration, JSON.stringify(value));
    }

    static createClient(): Client {
        return thenRedis.createClient(process.env.REDIS_URL);
    }
}