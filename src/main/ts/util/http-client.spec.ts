import * as rp from 'request-promise-native';
import {HttpClient} from "./http-client";

describe('Class: HttpClient', () => {
    let unitUnderTest: HttpClient;
    beforeEach(() => {
        delete process.env.CACHE_TIME;
        unitUnderTest = new HttpClient();
    });
    describe('constructor', () => {
        it('uses 10 seconds as default cache time value', () => {
            expect((unitUnderTest as any).cacheTime).toEqual(10);
        });
        it('uses the CACHE_TIME environment variable as cache time value if defined', () => {
            // given
            process.env.CACHE_TIME = '123';

            // when
            const unitUnderTest = new HttpClient();

            // then
            expect((unitUnderTest as any).cacheTime).toEqual(123);
        });
    });
    describe('Function: get(url)', () => {
        it('calls RequestPromiseNative.get(url) and returns the result', async () => {
            const expectedResult = 'expected result';
            spyOn(rp, 'get')
                .and.returnValue({promise: () => Promise.resolve(expectedResult)});

            // given
            const givenUrl = 'something';

            // when
            const actualResult =
                await unitUnderTest.get(givenUrl);

            // then
            expect(rp.get).toHaveBeenCalledWith(givenUrl);
            expect(actualResult).toEqual(expectedResult);
        });
    });
    describe('Function: head(url)', () => {
        it('calls RequestPromiseNative.head(url) and returns the result', async () => {
            const expectedResult = 'expected result';
            spyOn(rp, 'head')
                .and.returnValue({promise: () => Promise.resolve(expectedResult)});

            // given
            const givenUrl = 'something';

            // when
            const actualResult =
                await unitUnderTest.head(givenUrl);

            // then
            expect(rp.head).toHaveBeenCalledWith(givenUrl);
            expect(actualResult).toEqual(expectedResult);
        });
    });
});