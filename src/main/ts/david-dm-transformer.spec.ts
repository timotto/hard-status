import {DavidDmTransformer} from "./david-dm-transformer";
import * as nock from 'nock';

describe('Class: DavidDmTransformer', () => {
    const expectedBasePath = 'https://david-dm.org';
    const testPath = 'owner/repo';
    let unitUnderTest: DavidDmTransformer;
    let nockScope: nock.Scope;
    beforeEach(() => {
        unitUnderTest = new DavidDmTransformer(testPath);
        nockScope = nock(expectedBasePath)
            .get(`/${testPath}/info.json`)
            .reply(200, {status: 'notsouptodate'});
    });
    describe('Function: load', () => {
        it('fills the URL property with the queried URL', async () => {
            // when
            const actualResult = await unitUnderTest.load();
            // then
            expect(actualResult.url).toEqual(`https://david-dm.org/${testPath}/info.json`);
        });
        it('loads the JSON from the URL', async () => {
            // when
            await unitUnderTest.load();
            // then
            expect(nockScope.isDone()).toBeTruthy();
        });
        const pairs = [
            {status: undefined, result: 'u '},
            {status: 'uptodate', result: '+ '},
            {status: 'notsouptodate', result: 's '},
            {status: 'outofdate', result: '- '},
            {status: 'insecure', result: ' -'},
        ];
        pairs.forEach(pair => it(`turns status ${pair.status} into ${pair.result}`, async () => {
            nock.cleanAll();
            // given
            nock(expectedBasePath)
                .get(`/${testPath}/info.json`)
                .reply(200, {status: pair.status});

            // when
            const actualResult = await unitUnderTest.load();

            expect(actualResult.dots.length).toBe(1);
            expect(actualResult.dots).toContain(pair.result);
        }));
    });
});