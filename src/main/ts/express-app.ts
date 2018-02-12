import {Router} from "express";
import {ConcourseEndpoint} from "./concourse-endpoint";
import {HealthEndpoint} from "./health-endpoint";
import {MixedEndpoint} from "./mixed-endpoint";

export class ExpressApp {
    constructor(readonly app, private router: () => Router) {
        app.set("port", process.env.PORT || 3001);
        this.registerEndpoint('/healthz', HealthEndpoint);
        this.registerEndpoint('/concourse', ConcourseEndpoint);
        this.registerEndpoint('/', MixedEndpoint);
    }

    public registerEndpoint(path, endpoint) {
        this.app.use(path, new endpoint(this.router()).router);
    }

}