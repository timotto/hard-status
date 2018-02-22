import {HardStatusResponse} from "../hard-status-response";
import {HttpClient} from "../util/http-client";

const DOTVALUE_UNDEFINED = 'u ';
const DOTVALUE_UPTODATE = '+ ';
const DOTVALUE_NOTSOUPTODATE = 's ';
const DOTVALUE_OUTOFDATE = '- ';
const DOTVALUE_INSECURE = ' -';

export class DavidDmTransformer {
    constructor(private httpClient: HttpClient,
                private githubRepoPath: string) {

    }

    public load(): Promise<HardStatusResponse> {
        const url = `https://david-dm.org/${this.githubRepoPath}/info.json`;
        return this.httpClient.get(url)
            .then(JSON.parse)
            .then(data => {
                return davidDmResponseToDots(data, url);
            });
    }
}

const davidDmResponseToDots = (data, url: string): HardStatusResponse => {
    let dot = DOTVALUE_UNDEFINED;
    switch (data.status) {
        case 'uptodate':
            dot = DOTVALUE_UPTODATE;
            break;
        case 'notsouptodate':
            dot = DOTVALUE_NOTSOUPTODATE;
            break;
        case 'outofdate':
            dot = DOTVALUE_OUTOFDATE;
            break;
        case 'insecure':
            dot = DOTVALUE_INSECURE;
            break;
        default:
            dot = DOTVALUE_UNDEFINED;
            break;
    }
    return {url: url, dots: [dot]};
};

