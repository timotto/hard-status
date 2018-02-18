import {Router, Request, Response} from 'express';
import {Util} from "../util/util";
import {CheapCouch} from "../util/cheap-couch";

export class ManagedEndpoint {
    private cheapCouch: CheapCouch;
    private documentBaseUrl: string;
    constructor(readonly router: Router) {
        this.router.get('/', (req: Request, res: Response) => this.requestHandler(req, res));
        this.documentBaseUrl = Util.envOrDefault('DOCUMENT_BASE_URL', 'http://localhost:5984/hard-status-clients/');
        this.cheapCouch = new CheapCouch(this.documentBaseUrl);
    }

    private requestHandler(req: Request, res: Response): Promise<void> {
        const chipId = req.header('x-chip-id');

        if (!chipId) {
            res.sendStatus(400);
            return;
        }

        return this.cheapCouch.loadOrCreate(chipId)
            .then(result => this.makePromises(result))
            .then(promises => Promise.all(promises))
            .then(responses => responses
                .sort((a,b) => a.url.localeCompare(b.url))
                .map(response => response.dots)
                .reduce((a,b) => a.concat(...b), []))
            .then(dots => res.send(dots.join('')))
            .then(() => undefined)
            .catch(e => res.status(500).send(e));
    }

    private makePromises(result: any) {
        const concoursePromises = Util.allAsArray(result['concourse'])
            .map(url => Util.getConcourseTransformerFor(url).load());
        const davidDmPromises = Util.allAsArray(result['david-dm'])
            .map(url => Util.getDavidDmTransformerFor(url).load());
        const coverallsPromises = Util.allAsArray(result['coveralls'])
            .map(url => Util.getCoverallsTransformerFor(url).load());

        return concoursePromises
            .concat(...davidDmPromises)
            .concat(...coverallsPromises);
    }
}
