import {CoverallsTransformer} from "./coveralls-transformer";
import {DavidDmTransformer} from "./david-dm-transformer";
import {ConcourseTransformer} from "./concourse-transformer";

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
}