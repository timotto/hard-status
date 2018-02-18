import {Router, Request, Response} from 'express';
import {ConcourseTransformer} from "../transformer/concourse-transformer";
import * as accepts from 'accepts';
import {HardStatusResponse} from "../hard-status-response";

export class ConcourseEndpoint {

    constructor(readonly router: Router) {
        this.router.get('/', (req: Request, res: Response) => this.requestHandler(req, res));
    }

    private requestHandler(req: Request, res: Response) {
        const url = req.query['url'];
        if (url === undefined) return res.status(400).send('error: url parameter is missing');

        return this.formatResponse(req, res, new ConcourseTransformer(url).load());
    }

    private formatResponse(req: Request, res: Response, loadPromise: Promise<HardStatusResponse>) {
        const accept = accepts(req);
        let responder: Responder;
        switch (accept.type(['text/short', 'text/json'])) {
            case 'text/json': responder = new JsonResponder(res); break;
            default:
            case 'text/short': responder = new TextResponder(res); break;
        }

        return loadPromise
            .then(result => responder.then(result))
            .catch(error => responder.catch(error));

    }
}

abstract class Responder {
    constructor(protected res: Response) {
    }
    public abstract then(result: HardStatusResponse);
    public catch(error: Error) {
        this.res.status(500);
        return this._catch(error);
    }
    protected abstract _catch(error: Error);
}

class TextResponder extends Responder {
    then(result: HardStatusResponse) {
        return this.res.send(result.dots.join(''));
    }

    _catch(error: Error) {
        return this.res.send(error.message);
    }
}

class JsonResponder extends Responder {
    _catch(error: Error) {
        return this.res.send({message: error.message});
    }

    then(result: HardStatusResponse): any {
        return this.res.json(result);
    }
}