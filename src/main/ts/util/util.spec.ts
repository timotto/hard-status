import {Util} from "./util";
import {HttpClient} from "./http-client";

describe('Class: Util', () => {
    describe('Static Function: allAsArray', () => {
        it('returns an empty array for undefined', () =>
            expect(Util.allAsArray(undefined)).toEqual([]));
        it('returns a single item array for a string', () => {
            const singleItem = 'single item';
            const actualResult = Util.allAsArray(singleItem);
            expect(actualResult).toContain(singleItem);
            expect(actualResult.length).toEqual(1);
        });
        it('returns the array for an array', () => {
            const arrayItem = ['one','two','three'];
            const actualResult = Util.allAsArray(arrayItem);
            expect(actualResult).toEqual(arrayItem);
        });
    });
    describe('Static Function: getConcourseTransformerFor', () => {
        it('returns a new ConcourseTransformer instance for the given url', () => {
            // given
            const givenUrl = 'http://example.com';

            // when
            const actualResult = Util.getConcourseTransformerFor(new HttpClient(), givenUrl);

            // then
            expect(actualResult.constructor.name).toEqual('ConcourseTransformer');
            expect((actualResult as any).concourseUrl).toEqual(givenUrl);
        });
    });
    describe('Static Function: getDavidDmTransformerFor', () => {
        it('returns a new DavidDmTransformer instance for the given path', () => {
            // given
            const givenPath = 'some/repo';

            // when
            const actualResult = Util.getDavidDmTransformerFor(new HttpClient(), givenPath);

            // then
            expect(actualResult.constructor.name).toEqual('DavidDmTransformer');
            expect((actualResult as any).githubRepoPath).toEqual(givenPath);
        });
    });
    describe('Static Function: getCoverallsTransformerFor', () => {
        it('returns a new DavidDmTransformer instance for the given path', () => {
            // given
            const givenPath = 'some/repo';

            // when
            const actualResult = Util.getCoverallsTransformerFor(new HttpClient(), givenPath);

            // then
            expect(actualResult.constructor.name).toEqual('CoverallsTransformer');
            expect((actualResult as any).githubRepoPath).toEqual(givenPath);
        });
    });
    describe('Static Function: envOrDefault', () => {
        const testKeys = ['TEST_ENV1', 'TEST_ENV2'];
        const cleanup = () => testKeys.forEach(key => delete process.env[key]);
        beforeEach(cleanup);
        afterEach(cleanup);
        it('returns the value of the environment variable named "envKey"', () => {
            const testKey = testKeys[0];
            const expectedValue = 'expected value';
            const unexpectedValue = 'unexpected value';

            // given
            process.env[testKey] = expectedValue;

            // when
            const actualResult = Util.envOrDefault(testKey, unexpectedValue);

            // then
            expect(actualResult).toEqual(expectedValue);
        });
        it('returns the defaultValue if the value of the environment variable named "envKey" is not defined', () => {
            const testKey = testKeys[0];
            const expectedValue = 'expected value';

            // given

            // when
            const actualResult = Util.envOrDefault(testKey, expectedValue);

            // then
            expect(actualResult).toEqual(expectedValue);
        });
    });

});
