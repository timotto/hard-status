import {Router, Request, Response} from 'express';
import * as request from 'supertest';
import * as express from 'express';
import {ManagedEndpoint} from "./managed-endpoint";
import {CoverallsTransformer} from "./coveralls-transformer";
import {DavidDmTransformer} from "./david-dm-transformer";
import {ConcourseTransformer} from "./concourse-transformer";
import {Util} from "./util";
import any = jasmine.any;
import * as nock from 'nock';

const defaultDocumentBaseUrl = "http://localhost:5984/hard-status-clients/";

describe('Class: ManagedEndpoint', () => {
    let unitUnderTest: ManagedEndpoint;
    let mockApp;

    let nockScope: nock.Scope;

    let mockConcourseTransformer: ConcourseTransformer;
    let mockDavidDmTransformer: DavidDmTransformer;
    let mockCoverallsTransformer: CoverallsTransformer;

    const mockChipId = 'mock-id';

    let createDatabaseNock = (responseCode, responseBody) =>
        nockScope
            .get(`/hard-status-clients/${mockChipId}`)
            .reply(responseCode, responseBody);


    beforeEach(() => {
        delete process.env.DOCUMENT_BASE_URL;
        nockScope = nock("http://localhost:5984");

        mockConcourseTransformer = jasmine.createSpyObj<ConcourseTransformer>('ConcourseTransformer', ['load']);
        (mockConcourseTransformer.load as jasmine.Spy)
            .and.returnValue({url: 'url', dots: []});

        spyOn(Util, 'getConcourseTransformerFor')
            .and.returnValue(mockConcourseTransformer);

        mockDavidDmTransformer = jasmine.createSpyObj<DavidDmTransformer>('DavidDmTransformer', ['load']);
        (mockDavidDmTransformer.load as jasmine.Spy)
            .and.returnValue({url: 'url', dots: []});

        spyOn(Util, 'getDavidDmTransformerFor')
            .and.returnValue(mockDavidDmTransformer);

        mockCoverallsTransformer = jasmine.createSpyObj<CoverallsTransformer>('CoverallsTransformer', ['load']);
        (mockCoverallsTransformer.load as jasmine.Spy)
            .and.returnValue({url: 'url', dots: []});

        spyOn(Util, 'getCoverallsTransformerFor')
            .and.returnValue(mockCoverallsTransformer);

        unitUnderTest = new ManagedEndpoint(Router());
        mockApp = express();
        mockApp.use('/', unitUnderTest.router);
    });
    afterEach(() => {
        nock.cleanAll();
        delete process.env.DOCUMENT_BASE_URL;
    });
    describe('constructor', () => {
        it('registers the requestHandler on GET /', async () => {
            const router = Router();
            spyOn(router, 'get')
                .and.callThrough();

            // when
            const unitUnderTest = new ManagedEndpoint(router);
            spyOn((unitUnderTest as any), 'requestHandler')
                .and.callFake((req: Request, res: Response) =>
                    res.sendStatus(200));

            const mockApp = express();
            mockApp.use('/', unitUnderTest.router);

            await request(mockApp)
                .get('/')
                .expect(200);

            // then
            expect(router.get).toHaveBeenCalledWith('/', any(Function));
            expect((unitUnderTest as any).requestHandler).toHaveBeenCalled();
        });
        it(`uses "${defaultDocumentBaseUrl}" as documentBaseUrl by default`, () => {
            expect((unitUnderTest as any).documentBaseUrl).toEqual(defaultDocumentBaseUrl);
        });
        it('uses the environment variable DOCUMENT_BASE_URL as documentBaseUrl if defined', () => {
            const expectedDocumentBaseUrl = 'something';
            process.env.DOCUMENT_BASE_URL = expectedDocumentBaseUrl;
            const unitUnderTest = new ManagedEndpoint(Router());
            expect((unitUnderTest as any).documentBaseUrl).toEqual(expectedDocumentBaseUrl);
        });
    });

    describe('Function: requestHandler', () => {
        it('responds with a 400 error if the "X-Chip-Id" HTTP header is missing', async () => {
            nockScope = createDatabaseNock(200, {});
            // when
            await request(mockApp)
                .get('/')
                // then
                .expect(400);
        });

        it('responds with 200 OK if the "X-Chip-Id" HTTP header is present', async () => {
            nockScope = createDatabaseNock(200, {});
            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                // then
                .expect(200);
        });

        it('looks up the Chip-Id in the database', async () => {
            nockScope = createDatabaseNock(200, {});
            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                .expect(200);

            // then
            expect(nockScope.isDone()).toBeTruthy();
        });

        it('returns a 500 error if the database lookup failed', async () => {
            nockScope = createDatabaseNock(500, {});
            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                // then
                .expect(500);

            // then
            expect(nockScope.isDone()).toBeTruthy();
        });

        it('calls allAsArray on the "concourse" value of the parsed database response', async () => {
            const expectedValue = "1";
            nockScope = createDatabaseNock(200, {concourse: expectedValue});

            spyOn(Util, 'allAsArray')
                .and.returnValue([]);

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                .expect(200);

            // then
            expect(Util.allAsArray)
                .toHaveBeenCalledWith(expectedValue);
        });

        it('calls allAsArray on the "david-dm" value of the parsed database response', async () => {
            const expectedValue = "1";
            nockScope = createDatabaseNock(200, {"david-dm": expectedValue});

            spyOn(Util, 'allAsArray')
                .and.returnValue([]);

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                .expect(200);

            // then
            expect(Util.allAsArray)
                .toHaveBeenCalledWith(expectedValue);
        });

        it('calls allAsArray on the "coveralls" value of the parsed database response', async () => {
            nock.cleanAll();

            const expectedValue = "1";
            nockScope = createDatabaseNock(200, {"coveralls": expectedValue});

            spyOn(Util, 'allAsArray')
                .and.returnValue([]);

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                .expect(200);

            // then
            expect(Util.allAsArray)
                .toHaveBeenCalledWith(expectedValue);
        });

        it('calls load on a ConcourseTransformer instance for each concourse URL', async() => {
            nock.cleanAll();

            // given
            const givenUrl1 = 'url 1';
            const givenUrl2 = 'url 2';
            nockScope = createDatabaseNock(200, {concourse: [givenUrl1, givenUrl2]});

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                .expect(200);

            // then
            expect(Util.getConcourseTransformerFor).toHaveBeenCalledTimes(2);
            expect(Util.getConcourseTransformerFor).toHaveBeenCalledWith(givenUrl1);
            expect(Util.getConcourseTransformerFor).toHaveBeenCalledWith(givenUrl2);

            expect(mockConcourseTransformer.load).toHaveBeenCalledTimes(2);
        });

        it('calls load on a DavidDmTransformer instance for each david-dm path', async() => {
            nock.cleanAll();

            // given
            const givenUrl1 = 'url 1';
            const givenUrl2 = 'url 2';
            nockScope = createDatabaseNock(200, {'david-dm': [givenUrl1, givenUrl2]});

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                .expect(200);

            // then
            expect(Util.getDavidDmTransformerFor).toHaveBeenCalledTimes(2);
            expect(Util.getDavidDmTransformerFor).toHaveBeenCalledWith(givenUrl1);
            expect(Util.getDavidDmTransformerFor).toHaveBeenCalledWith(givenUrl2);

            expect(mockDavidDmTransformer.load).toHaveBeenCalledTimes(2);
        });

        it('calls load on a CoverallsTransformer instance for each coveralls path', async() => {
            nock.cleanAll();

            // given
            const givenUrl1 = 'url 1';
            const givenUrl2 = 'url 2';
            nockScope = createDatabaseNock(200, {'coveralls': [givenUrl1, givenUrl2]});

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                .expect(200);

            // then
            expect(Util.getCoverallsTransformerFor).toHaveBeenCalledTimes(2);
            expect(Util.getCoverallsTransformerFor).toHaveBeenCalledWith(givenUrl1);
            expect(Util.getCoverallsTransformerFor).toHaveBeenCalledWith(givenUrl2);

            expect(mockCoverallsTransformer.load).toHaveBeenCalledTimes(2);
        });

        it('responds with a concatenation of the dots arrays of the responses', async() => {
            const dots1 = ['1a','1b','1c'];
            const dots2 = ['2a','2b','2c'];
            const dots3 = ['3a','3b','3c'];
            const david1 = ['++','--','=='];
            const coveralls = ['xx','x1','x2'];

            // given
            (mockConcourseTransformer.load as jasmine.Spy)
                .and.returnValues({url: 'url1', dots: dots1}, {url: 'url2', dots: dots2}, {url: 'url3', dots: dots3});
            (mockDavidDmTransformer.load as jasmine.Spy)
                .and.returnValues({url: 'url8', dots: david1});
            (mockCoverallsTransformer.load as jasmine.Spy)
                .and.returnValues({url: 'url9', dots: coveralls});

            nockScope = createDatabaseNock(200, {
                'concourse': ['1','2','3'],
                'david-dm': '1',
                'coveralls': '1'
            });

            const expectedResponse = dots1
                .concat(...dots2)
                .concat(...dots3)
                .concat(...david1)
                .concat(...coveralls)
                .join('');

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                // then
                .expect(expectedResponse);
        });

        it('responds with a 500 error if the load operation fails', async () => {
            // given
            const expectedReason = 'expected reason';
            (mockConcourseTransformer.load as jasmine.Spy)
                .and.callFake(() => {
                return new Promise(((resolve, reject) => reject(expectedReason)));
            });
            nockScope = createDatabaseNock(200, {
                'concourse': '1'
            });

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                // then
                .expect(500);
        });

        it('sorts the response by url', async() => {
            const response1 = {url: '7', dots: ['1a','1b','1c']};
            const response2 = {url: '1', dots: ['2a','2b','2c']};
            const response3 = {url: '2', dots: ['3a','3b','3c']};
            const responses = [response1, response2, response3];
            const mockUrls = responses.filter(r => r.url);
            const expectedResponse = response2.dots
                .concat(...response3.dots)
                .concat(...response1.dots)
                .join('');

            // given
            (mockConcourseTransformer.load as jasmine.Spy)
                .and.returnValues(...responses);
            nockScope = createDatabaseNock(200, {
                'concourse': mockUrls
            });

            // when
            await request(mockApp)
                .get('/')
                .set('X-Chip-Id', mockChipId)
                // then
                .expect(expectedResponse);
        });

    });
});
