import {ConcourseEndpoint} from "./concourse-endpoint";
import * as express from 'express';
import {Router} from 'express';
import * as request from 'supertest';
import {ConcourseTransformer} from "./concourse-transformer";

describe('Class: ConcourseEndpoint', () => {
    let unitUnderTest: ConcourseEndpoint;
    let mockApp;
    beforeEach(() => {
        unitUnderTest = new ConcourseEndpoint(Router());
        mockApp = express();
        mockApp.use('/', unitUnderTest.router);
    });

    describe('GET on /', () => {
        it('returns a 400 error if the "url" request parameter is missing', async () => {
            let expectedReason = 'error: url parameter is missing';
            await request(mockApp)
                .get('/')
                .expect(400)
                .then(response =>
                    expect(response.text).toBe(expectedReason))
                .catch(error => expect(error).toEqual(expectedReason))
        });

        it('returns a 500 error with the Error.message if the ConcourseTransformer.load() promise is rejected', async () => {
            const expectedReason = 'some error text message';
            spyOn(ConcourseTransformer.prototype, 'load')
                .and
                .returnValue(Promise.reject(new Error(expectedReason)));

            await request(mockApp)
                .get('/?url=url')
                .expect(500)
                .then(response =>
                    expect(response.text).toBe(expectedReason))
                .catch(error => expect(error).toEqual(expectedReason))
        });

        it('returns the .dots array of the ConcourseTransformer response as a joined string', async () => {
            const expectedArray = ['a','b','c'];
            spyOn(ConcourseTransformer.prototype, 'load')
                .and
                .returnValue(Promise.resolve({dots:expectedArray}));

            await request(mockApp)
                .get('/?url=url')
                .expect(200)
                .then(response =>
                    expect(response.text).toBe(expectedArray.join('')))
        });

        describe('request with "Accept: text/json" header', () => {
            it('returns the plain ConcourseTransformer response', async () => {
                const expectedResponse = {dots:['a','b','c'], ranges:[1,2,3]};
                spyOn(ConcourseTransformer.prototype, 'load')
                    .and
                    .returnValue(Promise.resolve(expectedResponse));

                await request(mockApp)
                    .get('/?url=url')
                    .accept('text/json')
                    .expect(200)
                    .then(response =>
                        expect(response.body).toEqual(expectedResponse))
            });

            it('returns 500 and the the Error object if the ConcourseTransformer.load() promise is rejected', async () => {
                const expectedMessage = 'this failed';
                const expectedResponse = {message: expectedMessage};
                const expectedRejection = new Error(expectedMessage);
                spyOn(ConcourseTransformer.prototype, 'load')
                    .and
                    .returnValue(Promise.reject(expectedRejection));

                await request(mockApp)
                    .get('/?url=url')
                    .accept('text/json')
                    .expect(500)
                    .then(response =>
                        expect(response.body).toEqual(expectedResponse))
                    .catch(error => expect(error).toEqual(expectedResponse))
            });
        });
    });
});
