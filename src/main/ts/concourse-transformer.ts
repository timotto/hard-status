import * as rp from 'request-promise-native';

export class ConcourseTransformer {

    constructor(private concourseUrl: string) {
    }

    load(): Promise<any> {
        return this.apiGet('/pipelines')
            .then(pipelines => this.onPipelines(pipelines))
            .then(pipelines => this.sortPipelines(pipelines))
            .then(pipelines => this.transformResults(pipelines));
    }

    private transformResults(results: any[]): any {
        return results
            // calculate dot array first so length can be used in reduced step
            .map(pipeline => ({...pipeline, dots: pipeline.jobs.map(job => ConcourseTransformer.jobToDot(job))}))
            .reduce((result, pipeline) => ({
                dots: result.dots.concat(...pipeline.dots),
                ranges: result.ranges.concat({
                    team_name: pipeline.team_name,
                    pipeline: pipeline.name,
                    offset: result.dots.length,
                    length: pipeline.dots.length
                })}),
                {dots:[], ranges:[]});
    }

    private static jobToDot(job: any): any {
        const next = job.next_build === undefined || job.next_build === null
            ? ' '
            : ConcourseTransformer.parseJobStatus(job.next_build);
        const finished = job.finished_build === undefined || job.finished_build === null
            ? ConcourseTransformer.parseJobStatus({})
            : ConcourseTransformer.parseJobStatus(job.finished_build);

        return [finished,next].join('');
    }

    private static parseJobStatus(status: any): any {
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
        return this.apiGet(`${pipeline.url}/jobs`)
            .then(jobs => Promise.resolve({...pipeline, jobs: jobs}));
    }

    private apiGet(path: string): Promise<any> {
        const url = `${this.concourseUrl}/api/v1${path}`;
        return rp.get(url)
            .then(JSON.parse);
    }
}
