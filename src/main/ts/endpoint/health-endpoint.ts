import {Router, Request, Response} from 'express';

export class HealthEndpoint {
    constructor(readonly router: Router) {
        this.router.get('/', (req: Request, res: Response) => res.send('OK\n'));
    }
}