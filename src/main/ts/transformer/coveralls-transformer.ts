import {HardStatusResponse} from "../hard-status-response";
import {HttpClient} from "../util/http-client";

export class CoverallsTransformer {
    constructor(private httpClient: HttpClient,
                private githubRepoPath: string) {
        if (githubRepoPath === undefined)
            throw 'githubRepoPath cannot be undefined';
        if (!githubRepoPath.match("^[0-9a-zA-Z-_]+/[0-9a-zA-Z-_]+$"))
            throw 'githubRepoPath is not a plausible GitHub repository path';
    }

    public load(): Promise<HardStatusResponse> {
        const uri = `https://coveralls.io/repos/github/${this.githubRepoPath}/badge.svg?branch=master`;
        return this.httpClient.head({uri: uri, followRedirect: false})
            .catch(non200Response => {
                    if (non200Response.statusCode === 302 || non200Response.statusCode === 304)
                        return {
                            url: uri,
                            dots: [CoverallsTransformer.dotFromCoverage(
                                CoverallsTransformer.coverageFromHeaders(
                                    non200Response.response))]
                        };
                    throw non200Response;
                }
            );
    }

    static coverageFromHeaders(headers: any): number|undefined {
        if (headers === undefined) return undefined;
        if (headers.location === undefined) return undefined;
        const match = headers.location.match(`^https://s3.amazonaws.com/assets.coveralls.io/badges/coveralls_([0-9]+).svg$`);
        if (!match) return undefined;

        return parseInt(match[1]);
    }

    static dotFromCoverage(coverage: number): string {
        if (coverage === undefined) return 'u ';
        if (coverage === 100) return '+ ';
        if (coverage >= 90) return ' +';
        if (coverage >= 80) return 's ';
        if (coverage >= 50) return '- ';
        return ' -';
    }
}