import * as nock from "nock";
import {ConcourseTransformer} from "./concourse-transformer";
import {StatusCodeError} from "request-promise/errors";

const testConcourseUrl = 'https://concourse-web.example.com';

describe('Class: ConcourseTransformer', () => {
    let unitUnderTest: ConcourseTransformer;

    beforeEach(() => {
        unitUnderTest = new ConcourseTransformer(testConcourseUrl);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('Function: load()', () => {
        describe('invalid Concourse API responses', () => {
            it('rejects the promise on server errors', async () => {
                const expectedResponseCode = 503;
                const expectedResponseBody = 'Some detailed information';
                nock(testConcourseUrl)
                    .get(`/api/v1/pipelines`)
                    .reply(expectedResponseCode, expectedResponseBody);

                const actualResult = await unitUnderTest.load()
                    .then(success => fail(success))
                    .catch(error => error);
                expect(actualResult.constructor.name).toBe('StatusCodeError');
                expect((actualResult as StatusCodeError).statusCode).toBe(expectedResponseCode);
                expect((actualResult as StatusCodeError).error).toBe(expectedResponseBody);
            });

            it('rejects the promise on non-JSON responses', async () => {
                const expectedResponseCode = 200;
                const expectedResponseBody = 'Some wrong information';
                nock(testConcourseUrl)
                    .get(`/api/v1/pipelines`)
                    .reply(expectedResponseCode, expectedResponseBody);

                const actualResult = await unitUnderTest.load()
                    .then(success => fail(success))
                    .catch(error => error);
                expect(actualResult).toBeDefined();
            });

            it('rejects the promise on malformed JSON responses', async () => {
                const expectedResponseCode = 200;
                const expectedResponseBody = {"totally":"irrelevant"};
                nock(testConcourseUrl)
                    .get(`/api/v1/pipelines`)
                    .reply(expectedResponseCode, expectedResponseBody);

                const actualResult = await unitUnderTest.load()
                    .then(success => fail(success))
                    .catch(error => error);
                expect(actualResult).toBeDefined();
            });
        });
        describe('valid Concourse API responses', () => {
            describe('response with 0 pipelines', () => {
                it('returns {dots: [], ranges: []}', async () => {
                    const expectedResult = {dots: [], ranges: []};
                    const expectedResponseCode = 200;
                    const expectedResponseBody = [];
                    nock(testConcourseUrl)
                        .get(`/api/v1/pipelines`)
                        .reply(expectedResponseCode, expectedResponseBody);

                    const actualResult = await unitUnderTest.load();
                    expect(actualResult).toEqual(expectedResult);
                });
            });
        });
    });
});
