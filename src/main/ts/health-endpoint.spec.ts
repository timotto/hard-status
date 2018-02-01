import {HealthEndpoint} from "./health-endpoint";
import * as express from 'express';
import {Router} from 'express';
import * as request from 'supertest';

describe('Class: HealthEndpoint', () => {
    let mockApp;
    let unitUnderTest: HealthEndpoint;
    beforeEach(() => {
        unitUnderTest = new HealthEndpoint(Router());
        mockApp = express();
        mockApp.use('/', unitUnderTest.router);
    });
    describe('GET on /', () => {
        it('responds with "OK\n"', async () => {
            await request(mockApp)
                .get('/')
                .expect(200)
                .then(response =>
                    expect(response.text).toBe('OK\n'));
        });
    });
});