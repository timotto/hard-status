import * as rp from 'request-promise-native';

export class HttpClient {
    public get(url: string|any): Promise<any> {
        return rp.get(url);
    }
    public head(url: string|any): Promise<any> {
        return rp.head(url);
    }
}