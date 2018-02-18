export class JsonLogger {
    public static log(event: string, item: any) {
        console.log(JSON.stringify({event: event, timestamp: new Date().getTime(), item: item}));
    }
}