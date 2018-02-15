import {HardStatusResponse} from "./hard-status-response";
import * as request from 'request';

export class CoverallsTransformer {
    constructor(private githubRepoPath: string) {
        if (githubRepoPath === undefined)
            throw 'githubRepoPath cannot be undefined';
        if (!githubRepoPath.match("^[0-9a-zA-Z-_]+/[0-9a-zA-Z-_]+$"))
            throw 'githubRepoPath is not a plausible GitHub repository path';
    }

    public load(): Promise<HardStatusResponse> {
        return new Promise((resolve, reject) => {
            const uri = `https://coveralls.io/repos/github/${this.githubRepoPath}/badge.svg?branch=master`;
            request.head(uri, {followRedirect: false}, (error, response) => {
                if (error) return reject(error);
                const dot = CoverallsTransformer.dotFromCoverage(
                    CoverallsTransformer.coverageFromHeaders(
                        response.headers));
                const result = {
                    url: undefined,
                    dots: [dot],
                };
                resolve(result);
            });
        });
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