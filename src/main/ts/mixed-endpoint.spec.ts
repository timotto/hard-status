import {Router, Request, Response} from 'express';
import {MixedEndpoint} from "./mixed-endpoint";
import {ConcourseTransformer} from "./concourse-transformer";

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

        spyOn(MixedEndpoint, 'getConcourseTransformerFor')
            .and.returnValue(mockConcourseTransformer);

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

            spyOn(MixedEndpoint, 'allAsArray')
                .and.returnValue([]);

            // when
            (unitUnderTest as any).requestHandler(mockRequest, mockResponse);

            // then
            expect(MixedEndpoint.allAsArray)
                .toHaveBeenCalledWith(expectedArgument);
        });
        it('calls load on a ConcourseTransformer instance for each URL', async() => {
            // given
            const givenUrl1 = 'url 1';
            const givenUrl2 = 'url 2';
            mockRequest.query.concourse = [givenUrl1, givenUrl2];

            // when
            await requestCallback(mockRequest, mockResponse);

            // then
            expect(MixedEndpoint.getConcourseTransformerFor).toHaveBeenCalledTimes(2);
            expect(MixedEndpoint.getConcourseTransformerFor).toHaveBeenCalledWith(givenUrl1);
            expect(MixedEndpoint.getConcourseTransformerFor).toHaveBeenCalledWith(givenUrl2);

            expect(mockConcourseTransformer.load).toHaveBeenCalledTimes(2);
        });
        it('responds with a concatenation of the dots arrays of the responses', async() => {
            const dots1 = ['1a','1b','1c'];
            const dots2 = ['2a','2b','2c'];
            const dots3 = ['3a','3b','3c'];

            // given
            (mockConcourseTransformer.load as jasmine.Spy)
                .and.returnValues({url: 'url', dots: dots1}, {url: 'url', dots: dots2}, {url: 'url', dots: dots3});
            mockRequest.query.concourse = ['1','2','3'];

            // when
            await requestCallback(mockRequest, mockResponse);

            // then
            expect(mockResponse.send)
                .toHaveBeenCalledWith(dots1.concat(...dots2).concat(...dots3).join(''));
        });
        it('sorts the response by the concourse url', async() => {
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

describe('MixedEndpoint util functions', () => {
    describe('allAsArray', () => {
        it('returns an empty array for undefined', () =>
            expect(MixedEndpoint.allAsArray(undefined)).toEqual([]));
        it('returns a single item array for a string', () => {
            const singleItem = 'single item';
            const actualResult = MixedEndpoint.allAsArray(singleItem);
            expect(actualResult).toContain(singleItem);
            expect(actualResult.length).toEqual(1);
        });
        it('returns the array for an array', () => {
            const arrayItem = ['one','two','three'];
            const actualResult = MixedEndpoint.allAsArray(arrayItem);
            expect(actualResult).toEqual(arrayItem);
        });
    });
    describe('getConcourseTransformerFor', () => {
        it('returns a new ConcourseTransformer instance for the given url', () => {
            // given
            const givenUrl = 'http://example.com';

            // when
            const actualResult = MixedEndpoint.getConcourseTransformerFor(givenUrl);

            // then
            expect(actualResult.constructor.name).toEqual('ConcourseTransformer');
            expect((actualResult as any).concourseUrl).toEqual(givenUrl);
        });
    });
});