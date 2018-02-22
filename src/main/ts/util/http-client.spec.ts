import * as rp from 'request-promise-native';
import {HttpClient} from "./http-client";

describe('Class: HttpClient', () => {
    let unitUnderTest: HttpClient;
    beforeEach(() => {
        unitUnderTest = new HttpClient();
    });
    describe('Function: get(url)', () => {
        it('calls RequestPromiseNative.get(url) and returns the result', async () => {
            const expectedResult = 'expected result';
            spyOn(rp, 'get')
                .and.returnValue(Promise.resolve(expectedResult));

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
                .and.returnValue(Promise.resolve(expectedResult));

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