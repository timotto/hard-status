import {HardStatusResponse} from "../hard-status-response";
import {HttpClient} from "../util/http-client";

export class ConcourseTransformer {

    private team: string = undefined;
    private pipelinesOnly: boolean = false;

    constructor(private httpClient: HttpClient,
                private concourseUrl: string) {
        this.processConcourseUrl(concourseUrl);
    }

    private processConcourseUrl(concourseUrl: string) {
        if (concourseUrl.endsWith('/pipelines')) {
            this.pipelinesOnly = true;
            concourseUrl = concourseUrl.substr(0,
                concourseUrl.length - '/pipelines'.length);
        }
        const teamMatcher = concourseUrl.match("/teams/([^/]+)$");
        if (teamMatcher) {
            this.team = teamMatcher[1];
            concourseUrl = concourseUrl.substr(0,
                concourseUrl.length - teamMatcher[0].length);
        }
        this.concourseUrl = concourseUrl;
    }

    load(): Promise<HardStatusResponse> {
        return this.apiGet(this.team === undefined
            ? '/pipelines'
            : `/teams/${this.team}/pipelines`)
            .then(pipelines => this.onPipelines(pipelines))
            .then(pipelines => this.sortPipelines(pipelines))
            .then(pipelines => this.transformResults(pipelines));
    }

    private transformResults(results: any[]): HardStatusResponse {
        return this.pipelinesOnly
            ? results
            // calculate dot array first so length can be used in reduced step
                .map(pipeline => ({...pipeline, dots: pipeline.jobs.map(job => ConcourseTransformer.jobToDot(job))}))
                .reduce((result, pipeline) => ({
                        url: this.concourseUrl,
                        dots: result.dots.concat(
                            ConcourseTransformer.findWorstDot(pipeline.dots)),
                        ranges: result.ranges.concat({
                            team_name: pipeline.team_name,
                            pipeline: pipeline.name,
                            offset: result.dots.length,
                            length: pipeline.dots.length
                        })}),
                    {url: this.concourseUrl, dots:[], ranges:[]})

            : results
            // calculate dot array first so length can be used in reduced step
            .map(pipeline => ({...pipeline, dots: pipeline.jobs.map(job => ConcourseTransformer.jobToDot(job))}))
            .reduce((result, pipeline) => ({
                url: this.concourseUrl,
                dots: result.dots.concat(...pipeline.dots),
                ranges: result.ranges.concat({
                    team_name: pipeline.team_name,
                    pipeline: pipeline.name,
                    offset: result.dots.length,
                    length: pipeline.dots.length
                })}),
                {url: this.concourseUrl, dots:[], ranges:[]});
    }

    public static jobToDot(job: any): any {
        const next = job.next_build === undefined || job.next_build === null
            ? ' '
            : ConcourseTransformer.parseJobStatus(job.next_build);
        const finished = job.finished_build === undefined || job.finished_build === null
            ? ConcourseTransformer.parseJobStatus({})
            : ConcourseTransformer.parseJobStatus(job.finished_build);

        return [finished,next].join('');
    }

    public static findWorstDot(dots: string[]): string {
        return dots.length>0?dots.sort(ConcourseTransformer.sortDots)[0]:'';
    }

    public static sortDots(aString: string, bString: string): number {
        const aArray = aString.split('');
        const bArray = bString.split('');

        const a1 = ConcourseTransformer.rateDotValue(aArray[1]);
        const b1 = ConcourseTransformer.rateDotValue(bArray[1]);

        if (a1 < b1) return -1;
        if (a1 > b1) return 1;
        // last position is the same

        const a0 = ConcourseTransformer.rateDotValue(aArray[0]);
        const b0 = ConcourseTransformer.rateDotValue(bArray[0]);

        if (a0 < b0) return -1;
        if (a0 > b0) return 1;
        // first position is the same

        return 0;
    }

    public static rateDotValue(char: string): number {
        switch(char) {
            case '-': return 0;
            case 'e': return 1;
            case 'a': return 2;
            case 's': return 3;
            case 'p': return 4;
            case '+': return 5;
            case 'u': return 6;
            default: return 10;
        }
    }

    public static parseJobStatus(status: any): any {
        switch (status.status) {
            case undefined:
                return 'u';
            case 'started':
                return 's';
            case 'succeeded':
                return '+';
            case 'failed':
                return '-';
            case 'aborted':
                return 'a';
            case 'errored':
                return 'e';
            case 'pending':
                return 'p';
            default:
                console.log(`warning: unconsidered job status: ${status.status}`);
                return 'u';
        }
    }

    private sortPipelines(pipelines: any[]): any[] {
        pipelines.forEach(pipeline => pipeline.jobs = ConcourseTransformer.sortJobs(pipeline.jobs));
        return pipelines.sort((a, b) => a.url.localeCompare(b.url));
    }

    private static sortJobs(jobs: any[]): any[] {
        // TODO somehow make the jobs a linear representation of the pipeline
        return jobs;
    }

    private onPipelines(response: any): Promise<any[]> {
        const items = response
            .filter(pipeline => pipeline.paused !== true)
            .map(pipeline => this.loadJobs(pipeline));
        return Promise.all(items);
    }

    private loadJobs(pipeline: any): Promise<any> {
        pipeline.url = `/teams/${pipeline.team_name}/pipelines/${pipeline.name}`;
        return this.apiGet(`${pipeline.url}/jobs`)
            .then(jobs => Promise.resolve({...pipeline, jobs: jobs}))
            .catch(error => Promise.resolve({...pipeline, jobs: []}));
    }

    private apiGet(path: string): Promise<any> {
        const url = `${this.concourseUrl}/api/v1${path}`;
        return this.httpClient.get(url)
            .then(JSON.parse);
    }
}
