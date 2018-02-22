import {CoverallsTransformer} from "../transformer/coveralls-transformer";
import {DavidDmTransformer} from "../transformer/david-dm-transformer";
import {ConcourseTransformer} from "../transformer/concourse-transformer";
import {HttpClient} from "./http-client";

export class Util {
    static allAsArray(x: string | string[] | undefined): string[] {
        return (x === undefined)
            ? []
            : typeof x === 'string'
                ? [x]
                : x;
    }

    static getConcourseTransformerFor(httpClient: HttpClient, url: string): ConcourseTransformer {
        return new ConcourseTransformer(httpClient, url);
    }

    static getDavidDmTransformerFor(httpClient: HttpClient, path: string): DavidDmTransformer {
        return new DavidDmTransformer(httpClient, path);
    }

    static getCoverallsTransformerFor(httpClient: HttpClient, path: string): CoverallsTransformer {
        return new CoverallsTransformer(httpClient, path);
    }

    public static envOrDefault(envKey: string, defaultValue: string): string {
        let value = process.env[envKey];
        if (value === undefined) {
            return defaultValue;
        }

        return value;
    }
}