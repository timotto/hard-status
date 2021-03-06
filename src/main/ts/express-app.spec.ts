import * as express from 'express';
import {Router} from 'express';
import {ExpressApp} from "./express-app";
import {HealthEndpoint} from "./endpoint/health-endpoint";
import {ConcourseEndpoint} from "./endpoint/concourse-endpoint";
import {MixedEndpoint} from "./endpoint/mixed-endpoint";
import {ManagedEndpoint} from "./endpoint/managed-endpoint";

describe('Class: ExpressApp', () => {

    it('sets the "port" property to 3001 by default', () => {
        delete process.env.PORT;
        const app = express();
        spyOn(app, 'set').and.stub();
        new ExpressApp(app, Router);
        expect(app.set).toHaveBeenCalledWith('port', 3001);
    });

    it('sets the "port" property to value of the PORT environment variable if defined', () => {
        process.env.PORT = (Math.random() * 65535).toString();
        const app = express();
        spyOn(app, 'set').and.stub();
        new ExpressApp(app, Router);
        expect(app.set).toHaveBeenCalledWith('port', process.env.PORT);
    });

    it('registers the HealthEndpoint on /healthz', () => {
        const app = express();
        const spy = spyOn(ExpressApp.prototype, 'registerEndpoint').and.stub();
        new ExpressApp(app, Router);
        expect(spy).toHaveBeenCalledWith('/healthz', HealthEndpoint);
    });

    it('registers the ConcourseEndpoint on /concourse', () => {
        const app = express();
        const spy = spyOn(ExpressApp.prototype, 'registerEndpoint').and.stub();
        new ExpressApp(app, Router);
        expect(spy).toHaveBeenCalledWith('/concourse', ConcourseEndpoint);
    });

    it('registers the MixedEndpoint on /combined', () => {
        const app = express();
        const spy = spyOn(ExpressApp.prototype, 'registerEndpoint').and.stub();
        new ExpressApp(app, Router);
        expect(spy).toHaveBeenCalledWith('/combined', MixedEndpoint);
    });

    it('registers the ManagedEndpoint on /managed', () => {
        const app = express();
        const spy = spyOn(ExpressApp.prototype, 'registerEndpoint').and.stub();
        new ExpressApp(app, Router);
        expect(spy).toHaveBeenCalledWith('/managed', ManagedEndpoint);
    });
});
