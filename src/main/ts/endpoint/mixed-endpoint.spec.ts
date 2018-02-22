import {Router, Request, Response} from 'express';
import {MixedEndpoint} from "./mixed-endpoint";
import {ConcourseTransformer} from "../transformer/concourse-transformer";
import {DavidDmTransformer} from "../transformer/david-dm-transformer";
import {CoverallsTransformer} from "../transformer/coveralls-transformer";
import {Util} from "../util/util";
import {HttpClient} from "../util/http-client";
import any = jasmine.any;

describe('MixedEndpoint', () => {
    let unitUnderTest: MixedEndpoint;
    let mockRouter: Router;
    let mockResponse: Response;
    let mockRequest: Request;
    let requestCallback: (req: Request, res: Response) => Promise<void> = () => {
        const reason = 'no request handler set yet';
        fail(reason);
        return Promise.reject(reason);
    };
    let mockConcourseTransformer: ConcourseTransformer;
    let mockDavidDmTransformer: DavidDmTransformer;
    let mockCoverallsTransformer: CoverallsTransformer;

    beforeEach(() => {
        mockRouter = jasmine.createSpyObj<Router>('Router', ['get']);
        (mockRouter.get as jasmine.Spy)
            .and.callFake((path, cb) => {
                if (path === '/') requestCallback = cb;
        });

        mockResponse = jasmine.createSpyObj<Response>('Response', ['send', 'status']);
        (mockResponse.send as jasmine.Spy).and.returnValue(mockResponse);
        (mockResponse.status as jasmine.Spy).and.returnValue(mockResponse);
        mockRequest = jasmine.createSpyObj<Request>('Request', ['nothing']);
        mockRequest.query = {};

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

        unitUnderTest = new MixedEndpoint(mockRouter);
    });

    describe('constructor', () => {
        it('registers the requestHandler on GET /', () => {
            let actualPath = undefined;
            let actualCb = undefined;
            (mockRouter.get as jasmine.Spy)
                .and.callFake((path, cb) => {
                    actualPath = path;
                    actualCb = cb;
            });
            const instance = new MixedEndpoint(mockRouter);

            expect(actualPath).toEqual('/');

            spyOn((instance as any), 'requestHandler')
                .and.stub();

            const mockRequest = 'mock request';
            const mockResponse = 'mock response';
            actualCb(mockRequest, mockResponse);

            expect((instance as any).requestHandler)
                .toHaveBeenCalledWith(mockRequest, mockResponse);
        });
    });
    describe('requestHandler', () => {
        it('calls allAsArray on the req.query["concourse"] value', () => {
            const expectedArgument = 'expected argument';
            mockRequest.query.concourse = expectedArgument;

            spyOn(Util, 'allAsArray')
                .and.returnValue([]);

            // when
            (unitUnderTest as any).requestHandler(mockRequest, mockResponse);

            // then
            expect(Util.allAsArray)
                .toHaveBeenCalledWith(expectedArgument);
        });
        it('calls allAsArray on the req.query["david-dm"] value', () => {
            const expectedArgument = 'expected argument';
            mockRequest.query['david-dm'] = expectedArgument;

            spyOn(Util, 'allAsArray')
                .and.returnValue([]);

            // when
            (unitUnderTest as any).requestHandler(mockRequest, mockResponse);

            // then
            expect(Util.allAsArray)
                .toHaveBeenCalledWith(expectedArgument);
        });
        it('calls allAsArray on the req.query["coveralls"] value', () => {
            const expectedArgument = 'expected argument';
            mockRequest.query['coveralls'] = expectedArgument;

            spyOn(Util, 'allAsArray')
                .and.returnValue([]);

            // when
            (unitUnderTest as any).requestHandler(mockRequest, mockResponse);

            // then
            expect(Util.allAsArray)
                .toHaveBeenCalledWith(expectedArgument);
        });
        it('calls load on a ConcourseTransformer instance for each concourse URL', async() => {
            // given
            const givenUrl1 = 'url 1';
            const givenUrl2 = 'url 2';
            mockRequest.query.concourse = [givenUrl1, givenUrl2];

            // when
            await requestCallback(mockRequest, mockResponse);

            // then
            expect(Util.getConcourseTransformerFor).toHaveBeenCalledTimes(2);
            expect(Util.getConcourseTransformerFor).toHaveBeenCalledWith(any(HttpClient), givenUrl1);
            expect(Util.getConcourseTransformerFor).toHaveBeenCalledWith(any(HttpClient), givenUrl2);

            expect(mockConcourseTransformer.load).toHaveBeenCalledTimes(2);
        });
        it('calls load on a DavidDmTransformer instance for each david-dm parameter', async() => {
            // given
            const givenUrl1 = 'owner1/repo1';
            const givenUrl2 = 'owner2/repo8';
            mockRequest.query['david-dm'] = [givenUrl1, givenUrl2];

            // when
            await requestCallback(mockRequest, mockResponse);

            // then
            expect(Util.getDavidDmTransformerFor).toHaveBeenCalledTimes(2);
            expect(Util.getDavidDmTransformerFor).toHaveBeenCalledWith(any(HttpClient), givenUrl1);
            expect(Util.getDavidDmTransformerFor).toHaveBeenCalledWith(any(HttpClient), givenUrl2);

            expect(mockDavidDmTransformer.load).toHaveBeenCalledTimes(2);
        });
        it('calls load on a CoverallsTransformer instance for each coveralls parameter', async() => {
            // given
            const givenUrl1 = 'owner1/repo1';
            const givenUrl2 = 'owner2/repo8';
            mockRequest.query['coveralls'] = [givenUrl1, givenUrl2];

            // when
            await requestCallback(mockRequest, mockResponse);

            // then
            expect(Util.getCoverallsTransformerFor).toHaveBeenCalledTimes(2);
            expect(Util.getCoverallsTransformerFor).toHaveBeenCalledWith(any(HttpClient), givenUrl1);
            expect(Util.getCoverallsTransformerFor).toHaveBeenCalledWith(any(HttpClient), givenUrl2);

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
            mockRequest.query.concourse = ['1','2','3'];
            mockRequest.query['david-dm'] = ['8'];
            mockRequest.query['coveralls'] = ['9'];

            // when
            await requestCallback(mockRequest, mockResponse);

            // then
            expect(mockResponse.send)
                .toHaveBeenCalledWith(dots1
                    .concat(...dots2)
                    .concat(...dots3)
                    .concat(...david1)
                    .concat(...coveralls)
                    .join(''));
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
            mockRequest.query.concourse = mockUrls;

            // when
            await requestCallback(mockRequest, mockResponse);

            // then
            expect(mockResponse.send).toHaveBeenCalledWith(expectedResponse);
        });
        it('responds with a 500 error if the load operation fails', async () => {
            // given
            const expectedReason = 'expected reason';
            (mockConcourseTransformer.load as jasmine.Spy)
                .and.callFake(() => {
                    return new Promise(((resolve, reject) => reject(expectedReason)));
            });
            mockRequest.query.concourse = '1';

            // when
            await requestCallback(mockRequest, mockResponse);

            // then
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.send).toHaveBeenCalledWith(expectedReason);
        });
    });
});
