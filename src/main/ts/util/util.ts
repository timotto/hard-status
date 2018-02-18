import {CoverallsTransformer} from "../transformer/coveralls-transformer";
import {DavidDmTransformer} from "../transformer/david-dm-transformer";
import {ConcourseTransformer} from "../transformer/concourse-transformer";

export class Util {
    static allAsArray(x: string | string[] | undefined): string[] {
        return (x === undefined)
            ? []
            : typeof x === 'string'
                ? [x]
                : x;
    }

    static getConcourseTransformerFor(url: string): ConcourseTransformer {
        return new ConcourseTransformer(url);
    }

    static getDavidDmTransformerFor(path: string): DavidDmTransformer {
        return new DavidDmTransformer(path);
    }

    static getCoverallsTransformerFor(path: string): CoverallsTransformer {
        return new CoverallsTransformer(path);
    }

    public static envOrDefault(envKey: string, defaultValue: string): string {
        let value = process.env[envKey];
        if (value === undefined) {
            return defaultValue;
        }

        return value;
    }
}