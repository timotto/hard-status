import {Util} from "./util";

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
            const actualResult = Util.getConcourseTransformerFor(givenUrl);

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
            const actualResult = Util.getDavidDmTransformerFor(givenPath);

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
            const actualResult = Util.getCoverallsTransformerFor(givenPath);

            // then
            expect(actualResult.constructor.name).toEqual('CoverallsTransformer');
            expect((actualResult as any).githubRepoPath).toEqual(givenPath);
        });
    });
});
