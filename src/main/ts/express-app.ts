import {Router} from "express";
import {ConcourseEndpoint} from "./concourse-endpoint";
import {HealthEndpoint} from "./health-endpoint";
import {MixedEndpoint} from "./mixed-endpoint";
import {ManagedEndpoint} from "./managed-endpoint";

export class ExpressApp {
    constructor(readonly app, private router: () => Router) {
        app.set("port", process.env.PORT || 3001);
        this.registerEndpoint('/healthz', HealthEndpoint);
        this.registerEndpoint('/concourse', ConcourseEndpoint);
        this.registerEndpoint('/combined', MixedEndpoint);
        this.registerEndpoint('/managed', ManagedEndpoint);
    }

    public registerEndpoint(path, endpoint) {
        this.app.use(path, new endpoint(this.router()).router);
    }

}