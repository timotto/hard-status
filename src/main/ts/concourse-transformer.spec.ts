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
                it('returns {url: "concourse url", dots: [], ranges: []}', async () => {
                    const expectedResult = {url: testConcourseUrl, dots: [], ranges: []};
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

    describe('Static Function: parseJobStatus', () => {
        const pairs = [
            {status: undefined, result: 'u'},
            {status: 'started', result: 's'},
            {status: 'succeeded', result: '+'},
            {status: 'failed', result: '-'},
            {status: 'aborted', result: 'a'},
            {status: 'errored', result: 'e'},
            {status: 'pending', result: 'p'},
            {status: 'not defined', result: 'u'}
        ];
        pairs.forEach(pair => it(`turns status ${pair.status} into ${pair.result}`, () =>
            expect(ConcourseTransformer.parseJobStatus({status: pair.status}))
                .toEqual(pair.result)));
    });
    describe('Static Function: jobToDot', () => {
        it('returns the result of parseJobStatus for job.finished_build and job.next_build', () => {
            const finished = {status: 'failed'};
            const next = {status: 'started'};
            const expectedResult = [
                ConcourseTransformer.parseJobStatus(finished),
                ConcourseTransformer.parseJobStatus(next)
            ].join('');

            // given
            const job = {
                finished_build: finished,
                next_build: next
            };

            // when
            const actualResult = ConcourseTransformer.jobToDot(job);

            // then
            expect(actualResult).toEqual(expectedResult);
        });
        it('returns a blank if job.next_build is undefined or null', () => {
            const finished = {status: 'failed'};
            const expectedResult = [
                ConcourseTransformer.parseJobStatus(finished),
                ' '
            ].join('');

            // given
            const undefinedJob = {
                finished_build: finished,
                next_build: undefined
            };

            // when
            const actualResultForUndefined = ConcourseTransformer.jobToDot(undefinedJob);

            // then
            expect(actualResultForUndefined).toEqual(expectedResult);

            // given
            const nullJob = {
                finished_build: finished,
                next_build: null
            };

            // when
            const actualResultForNull = ConcourseTransformer.jobToDot(nullJob);

            // then
            expect(actualResultForNull).toEqual(expectedResult);
        });
        it('returns u if job.finished_build is undefined or null', () => {
            const next = {status: 'pending'};
            const expectedResult = [
                'u',
                ConcourseTransformer.parseJobStatus(next)
            ].join('');

            // given
            const undefinedJob = {
                finished_build: undefined,
                next_build: next
            };

            // when
            const actualResultForUndefined = ConcourseTransformer.jobToDot(undefinedJob);

            // then
            expect(actualResultForUndefined).toEqual(expectedResult);

            // given
            const nullJob = {
                finished_build: null,
                next_build: next
            };

            // when
            const actualResultForNull = ConcourseTransformer.jobToDot(nullJob);

            // then
            expect(actualResultForNull).toEqual(expectedResult);
        });
    });
});
