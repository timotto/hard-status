import {Router} from "express";
import {ConcourseEndpoint} from "./endpoint/concourse-endpoint";
import {HealthEndpoint} from "./endpoint/health-endpoint";
import {MixedEndpoint} from "./endpoint/mixed-endpoint";
import {ManagedEndpoint} from "./endpoint/managed-endpoint";

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