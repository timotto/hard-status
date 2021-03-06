import {Router, Request, Response} from 'express';
import {HardStatusResponse} from "../hard-status-response";
import {Util} from "../util/util";
import {HttpClient} from "../util/http-client";

export class MixedEndpoint {
    private httpClient: HttpClient = new HttpClient();
    constructor(readonly router: Router) {
        this.router.get('/', (req: Request, res: Response) => this.requestHandler(req, res));
    }

    private requestHandler(req: Request, res: Response): Promise<void> {
        const promises: Promise<HardStatusResponse>[] = Util.allAsArray(req.query['concourse'])
            .map(url =>
                Util.getConcourseTransformerFor(this.httpClient, url)
                    .load());
        const promises2: Promise<HardStatusResponse>[] = Util.allAsArray(req.query['david-dm'])
            .map(url =>
                Util.getDavidDmTransformerFor(this.httpClient, url)
                    .load());
        const promises3: Promise<HardStatusResponse>[] = Util.allAsArray(req.query['coveralls'])
            .map(url =>
                Util.getCoverallsTransformerFor(this.httpClient, url)
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
}