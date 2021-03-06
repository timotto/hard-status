import * as nock from "nock";
import {ConcourseTransformer} from "./concourse-transformer";
import {StatusCodeError} from "request-promise/errors";
import {HttpClient} from "../util/http-client";

const testConcourseUrl = 'https://concourse-web.example.com';

describe('Class: ConcourseTransformer', () => {
    let unitUnderTest: ConcourseTransformer;

    beforeEach(() => {
        unitUnderTest = new ConcourseTransformer(
            new HttpClient(),
            testConcourseUrl);
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
            describe('response with 2 pipeline with 3 successful jobs', () => {
                it('returns an object with 3 items in the dots property, all are "+ "', async () => {
                    const givenConcourseUrl = 'http://test-concourse.example.com';
                    const mockPipelineResponse = [{name:"1", team_name: "t1"},{name:"3", team_name: "t2"}];
                    const mockJobResponse = [{finished_build:{status:"succeeded"}},{finished_build:{status:"succeeded"}},{finished_build:{status:"succeeded"}}];

                    // given
                    unitUnderTest = new ConcourseTransformer(new HttpClient(), givenConcourseUrl);
                    spyOn((unitUnderTest as any), 'apiGet')
                        .and.callFake(path =>
                        Promise.resolve(path === '/pipelines'
                            ? mockPipelineResponse
                            : mockJobResponse));

                    // when
                    const actualResult = await unitUnderTest.load();

                    // then
                    expect(actualResult.dots.length)
                        .toEqual(mockPipelineResponse.length * mockJobResponse.length);
                });
            });

        });
        describe('Concourse 3.9.0 API changes', () => {
            it('builds the now gone "url" property from "team_name" and "pipeline"', async () => {
                const expectedTeamName = 'team-name';
                const expectedPipelineName = 'pipeline-name';

                // given
                const scope = nock(testConcourseUrl)
                    .get('/api/v1/pipelines')
                    .reply(200, [{
                        "id": 123,
                        "name": expectedPipelineName,
                        "paused": false,
                        "public": true,
                        "team_name": expectedTeamName
                    }])
                    .get(`/api/v1/teams/${expectedTeamName}/pipelines/${expectedPipelineName}/jobs`)
                    .reply(200, []);

                // when
                await unitUnderTest.load();

                // then
                expect(scope.isDone()).toBeTruthy();
            });
        });
        describe('concourseUrl ends in /teams/someTeamName', () => {
            it('only loads jobs of team someTeamName', async () => {
                const givenTeamName = 'team-name';
                const expectedConcourseUrl = 'http://concourse.example.com';
                const givenConcourseUrl = `${expectedConcourseUrl}/teams/${givenTeamName}`;

                // given
                unitUnderTest = new ConcourseTransformer(new HttpClient(), givenConcourseUrl);
                spyOn((unitUnderTest as any), 'apiGet')
                    .and.returnValue(Promise.resolve());

                // when
                await unitUnderTest.load()
                    .catch(() => undefined);

                // then
                expect((unitUnderTest as any).apiGet)
                    .toHaveBeenCalledWith(`/teams/${givenTeamName}/pipelines`);
                expect((unitUnderTest as any).concourseUrl)
                    .toEqual(expectedConcourseUrl);
            });
        });
        describe('concourseUrl ends in /pipelines', () => {
            it('returns only one dot per pipeline instead of one per job', async () => {
                const expectedConcourseUrl = 'http://test-concourse.example.com';
                const givenConcourseUrl = `${expectedConcourseUrl}/pipelines`;
                const mockPipelineResponse = [{name:"1", team_name: "t1"},{name:"3", team_name: "t2"}];
                const mockJobResponse = [{finished_build:{status:"succeeded"}},{finished_build:{status:"succeeded"}},{finished_build:{status:"succeeded"}}];

                // given
                unitUnderTest = new ConcourseTransformer(new HttpClient(), givenConcourseUrl);
                spyOn((unitUnderTest as any), 'apiGet')
                    .and.callFake(path =>
                    Promise.resolve(path === '/pipelines'
                        ? mockPipelineResponse
                        : mockJobResponse));

                // when
                const actualResult = await unitUnderTest.load();

                // then
                expect(actualResult.dots.length).toEqual(mockPipelineResponse.length);
            })
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

    describe('Static Function: findWorstDot', () => {
        it('returns an empty string if the dots array is empty', () => {
            expect(ConcourseTransformer.findWorstDot([])).toEqual('');
        });
        it('returns the first item ordered by static function sortDots', () => {
            // given
            const givenDots = ['- ', '+s', 'ap', 'uu'];

            // when
            const actualResult = ConcourseTransformer.findWorstDot(givenDots);

            // then
            expect(actualResult).toEqual('+s');
        });
    });

    describe('Static Function: sortDots', () => {
        it('sorts dot strings in the order -easp+u?, first by second character than by the first one', () => {
            expect(ConcourseTransformer.sortDots('- ', '+s')).toEqual(1);
            expect(ConcourseTransformer.sortDots('ep', 'as')).toEqual(1);
            expect(ConcourseTransformer.sortDots('+p', '- ')).toEqual(-1);
            expect(ConcourseTransformer.sortDots('+s', '-p')).toEqual(-1);
            expect(ConcourseTransformer.sortDots('ap', 'ap')).toEqual(0);
            expect(ConcourseTransformer.sortDots('+ ', 'a ')).toEqual(1);
            expect(ConcourseTransformer.sortDots('a ', 'u ')).toEqual(-1);
        });
    });
    describe('Static Function: rateDotValue', () => {
        it('rates a dot string character in the order -easp+u', () => {
            const expectedOrder = '-easp+u'.split('');

            expectedOrder.forEach((item,index) => {
                expect(ConcourseTransformer.rateDotValue(item)).toEqual(index);
            });
        });
    });
});
