import {CoverallsTransformer} from "./coveralls-transformer";
import * as request from 'request';
import * as nock from 'nock';

describe('Class: CoverallsTransformer', () => {
    const testGithubRepoPath = 'owner/repo';
    const coverageValueInRedirect: number = 85;

    let unitUnderTest: CoverallsTransformer;
    let nockScope: nock.Scope;
    beforeEach(() => {
        nockScope = nock('https://coveralls.io')
            .head(`/repos/github/${testGithubRepoPath}/badge.svg?branch=master`)
            .reply(304, 'redirected', {
                Location: `https://s3.amazonaws.com/assets.coveralls.io/badges/coveralls_${coverageValueInRedirect}.svg`
            });

        unitUnderTest = new CoverallsTransformer(testGithubRepoPath);
    });
    afterEach(() => {
        nock.cleanAll();
    });
    describe('constructor', () => {
        it('throws if the argument is not a plausible github owner/repo value', () => {
            [
                undefined,
                'no-slash',
                'two/slashes/string',
                'space value',
                'space values/with slash'
            ].forEach(value => {
                try {
                    new CoverallsTransformer(value);
                    fail(`no error with "${value}" as argument`);
                } catch (e) {
                    expect(e).toBeDefined();
                }
            });
        });
    });
    describe('Function: load', () => {
        it('executes a HEAD request on the Coveralls badge URL', async () => {
            // when
            await unitUnderTest.load();

            // then
            expect(nockScope.isDone()).toBeTruthy();
        });
        it('resolves to the expected coverage value', async () => {
            // given
            const expectedResult = CoverallsTransformer.dotFromCoverage(coverageValueInRedirect);
            // when
            const actualResult = await unitUnderTest.load();

            // then
            expect(actualResult.dots).toEqual([expectedResult]);
        });
        it('rejects the promise of the HEAD request returns an error', async () => {
            const expectedReason = 'expected reason';

            // given
            spyOn(request, 'head')
                .and.callFake((uri, options, cb) => cb(expectedReason));

            // when
            await unitUnderTest.load()
                .then(() => fail())
                // then
                .catch(e => expect(e).toEqual(expectedReason))
        });
    });
    describe('Static Function: coverageFromHeaders', () => {
        it('returns the percentage parsed from the 304 Location HTTP header value', () => {
            // given
            const givenHeaders = {
                'location': 'https://s3.amazonaws.com/assets.coveralls.io/badges/coveralls_85.svg'
            };

            // when
            const actualResult = CoverallsTransformer.coverageFromHeaders(givenHeaders);

            // then
            expect(actualResult).toEqual(85);
        });
        it('returns undefined if the headers argument value is undefined', () =>
            expect(CoverallsTransformer.coverageFromHeaders(undefined))
                .toBeUndefined());
        it('returns undefined if the location header value is undefined', () =>
            expect(CoverallsTransformer.coverageFromHeaders({no: 'location header'}))
                .toBeUndefined());
        it('returns undefined if there is no plausible Location header value', () => {
            // given
            [
                undefined,
                'something',
                'http://www.google.com',
                `https://coveralls.io/repos/github/${testGithubRepoPath}/badge.svg?branch=master`
            ].forEach(value => {
                const givenHeaders = {
                    'unexpected': 'value',
                    'location': value
                };

                // when
                const actualResult: number|undefined = CoverallsTransformer.coverageFromHeaders(givenHeaders);

                // then
                expect(actualResult).toBeUndefined();
            });
        });
    });
    describe('Static Function: responseFromCoverage', () => {
        it('shows undefined coverage "u "', () => {
            // given
            const givenCoverage = undefined;

            // when
            const actualResult: string
                = CoverallsTransformer.dotFromCoverage(givenCoverage);

            // then
            expect(actualResult).toEqual('u ');
        });
        it('shows coverage of 100% as "+ "', () => {
            // given
            const givenCoverage = 100;

            // when
            const actualResult: string
                = CoverallsTransformer.dotFromCoverage(givenCoverage);

            // then
            expect(actualResult).toEqual('+ ');
        });
        it('shows coverage of >= 90% < 100% as " +"', () => {
            for(let value: number = 90; value < 100; value += 0.5)
                expect(CoverallsTransformer.dotFromCoverage(value))
                    .toEqual(' +', `for ${value}`);
        });
        it('shows coverage of >= 80% < 90% as "s "', () => {
            for(let value: number = 80; value < 90; value += 0.5)
                expect(CoverallsTransformer.dotFromCoverage(value))
                    .toEqual('s ', `for ${value}`);
        });
        it('shows coverage of >= 50% < 80% as "- "', () => {
            for(let value: number = 50; value < 80; value += 0.5)
                expect(CoverallsTransformer.dotFromCoverage(value))
                    .toEqual('- ', `for ${value}`);
        });
        it('shows coverage < 50% " -"', () => {
            for(let value: number = 0; value < 50; value += 0.5)
                expect(CoverallsTransformer.dotFromCoverage(value))
                    .toEqual(' -', `for ${value}`);
        });
    });
});