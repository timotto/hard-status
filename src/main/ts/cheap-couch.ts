import * as rp from 'request-promise-native';

export class CheapCouch {
    constructor(private documentBaseUrl: string) {

    }

    public load(documentId: string): Promise<any> {
        return rp.get({
            uri: `${this.documentBaseUrl}${documentId}`,
            simple: true,
            resolveWithFullResponse: false})
            .then(JSON.parse);
    }

    public create(documentId: string): Promise<any> {
        return rp.post({
            uri: this.documentBaseUrl,
            simple: true,
            resolveWithFullResponse: false,
            json: {_id: documentId}});
    }

    public loadOrCreate(documentId: string): Promise<any> {
        return this.load(documentId)
            .catch(e => {
                if (e.statusCode === 404) return this.create(documentId);
                else throw e;
            });
    }
}