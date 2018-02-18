import {CheapCouch} from "./cheap-couch";
import * as nock from 'nock';

describe('Class: CheapCouch', () => {
    let unitUnderTest: CheapCouch;
    let nockScope: nock.Scope;

    const testBaseUrl = 'http://test-server:12345';
    const testCollectionPath = '/some-collection/';
    const testDocumentBaseUrl = testBaseUrl + testCollectionPath;

    beforeEach(() => {
        nockScope = nock(testBaseUrl);
        unitUnderTest = new CheapCouch(testDocumentBaseUrl);
    });
    afterEach(() => {
        nock.cleanAll();
    });
    describe('Function: load(id)', () => {
        it('makes a GET request on {documentBaseUrl}{id}', async () => {
            // given
            const expectedId = 'expected-id';
            nockScope.get(`${testCollectionPath}${expectedId}`)
                .reply(200, {});

            // when
            await unitUnderTest.load(expectedId);

            // then
            expect(nockScope.isDone()).toBeTruthy();
        });
        it('returns the parsed JSON result of the GET request on {documentBaseUrl}{id}', async () => {
            // given
            const givenId = 'expected-id';
            const expectedResponse = {"expected": "response"};
            nockScope.get(`${testCollectionPath}${givenId}`)
                .reply(200, expectedResponse);

            // when
            const actualResult = await unitUnderTest.load(givenId);

            // then
            expect(actualResult).toEqual(expectedResponse);
        });
    });
    describe('Function: create(id)', () => {
        it('makes a POST request on documentBaseUrl with {_id:id} in the request body', async () => {
            // given
            const givenId = 'given-id';
            nockScope.post(testCollectionPath, JSON.stringify({_id: givenId}))
                .reply(201, {});

            // when
            await unitUnderTest.create(givenId);

            // then
            expect(nockScope.isDone()).toBeTruthy();
        });
        it('returns the parsed JSON result of the GET request on {documentBaseUrl}{id}', async () => {
            // given
            const givenId = 'expected-id';
            const expectedResponse = {_id: givenId};
            nockScope.post(testCollectionPath, JSON.stringify({_id: givenId}))
                .reply(201, expectedResponse);

            // when
            const actualResult = await unitUnderTest.create(givenId);

            // then
            expect(actualResult).toEqual(expectedResponse);
        });
    });
    describe('Function: loadOrCreate(id)', () => {
        it('calls load(id) and returns the result', async () => {
            // given
            const givenId = 'given-id';
            const expectedResponse = {"expected": "response"};
            spyOn(unitUnderTest, 'load')
                .and.returnValue(Promise.resolve(expectedResponse));

            // when
            const actualResult = await unitUnderTest.loadOrCreate(givenId);

            // then
            expect(unitUnderTest.load).toHaveBeenCalledWith(givenId);
            expect(actualResult).toEqual(expectedResponse);
        });
        it('calls create(id) and returns the result if load(id) failed', async () => {
            // given
            const givenId = 'given-id';
            const expectedResponse = {"expected": "response"};
            nockScope.get(`${testCollectionPath}${givenId}`)
                .reply(404);
            spyOn(unitUnderTest, 'load')
                .and.callThrough();
            spyOn(unitUnderTest, 'create')
                .and.returnValue(Promise.resolve(expectedResponse));

            // when
            const actualResult = await unitUnderTest.loadOrCreate(givenId);

            // then
            expect(unitUnderTest.load).toHaveBeenCalledWith(givenId);
            expect(unitUnderTest.create).toHaveBeenCalledWith(givenId);
            expect(actualResult).toEqual(expectedResponse);
        });
        it('throws if load(id) failed with error other than 404', async () => {
            // given
            const givenId = 'given-id';
            const expectedReason = 'expected reason';
            const expectedStatusCode = 500;
            nockScope.get(`${testCollectionPath}${givenId}`)
                .reply(expectedStatusCode, expectedReason);

            // when
            await unitUnderTest.loadOrCreate(givenId)
                .then(() => fail())
                // then
                .catch(e => {
                    expect(e.statusCode).toEqual(expectedStatusCode);
                    expect(e.error).toEqual(expectedReason);
                });
        });
    });
});