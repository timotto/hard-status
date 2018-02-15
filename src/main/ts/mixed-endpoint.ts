import {Router, Request, Response} from 'express';
import {ConcourseTransformer} from "./concourse-transformer";
import {HardStatusResponse} from "./hard-status-response";
import {DavidDmTransformer} from "./david-dm-transformer";
import {CoverallsTransformer} from "./coveralls-transformer";

export class MixedEndpoint {
    constructor(readonly router: Router) {
        this.router.get('/', (req: Request, res: Response) => this.requestHandler(req, res));
    }

    private requestHandler(req: Request, res: Response): Promise<void> {
        const promises: Promise<HardStatusResponse>[] = MixedEndpoint.allAsArray(req.query['concourse'])
            .map(url =>
                MixedEndpoint.getConcourseTransformerFor(url)
                    .load());
        const promises2: Promise<HardStatusResponse>[] = MixedEndpoint.allAsArray(req.query['david-dm'])
            .map(url =>
                MixedEndpoint.getDavidDmTransformerFor(url)
                    .load());
        const promises3: Promise<HardStatusResponse>[] = MixedEndpoint.allAsArray(req.query['coveralls'])
            .map(url =>
                MixedEndpoint.getCoverallsTransformerFor(url)
                    .load());

        return Promise.all(promises.concat(...promises2).concat(...promises3))
            .then(responses => responses
                .sort((a,b) => a.url.localeCompare(b.url))
                .map(response => response.dots)
                .reduce((a,b) => a.concat(...b), []))
            .then(dots => res.send(dots.join('')))
            .then(() => undefined)
            .catch(e => res.status(500).send(e));
    }

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