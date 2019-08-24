import * as rp from 'request-promise-native';
import {ConditionalRedis} from "./conditional-redis";

export class HttpClient {
    private redis: ConditionalRedis = new ConditionalRedis();
    private cacheTime: number = 10;
    constructor() {
        if (process.env.CACHE_TIME !== undefined) {
            this.cacheTime = parseInt(process.env.CACHE_TIME);
        }
    }
    public get(url: string|any): Promise<any> {
        return this.redis.getOrFetch<any>(url,
            this.cacheTime,
            () => rp.get(url).promise(),
            JSON.parse);
    }
    public head(url: string|any): Promise<any> {
        return this.redis.getOrFetch<any>(url,
            this.cacheTime,
            () => rp.head(url).promise(),
            JSON.parse);
    }
}