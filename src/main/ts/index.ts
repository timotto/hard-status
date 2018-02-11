import * as express from "express";
import {Router} from 'express';
import {JsonLogger} from "./json-logger";
import {ExpressApp} from "./express-app";

const app = express();

new ExpressApp(app, Router);

app.listen(app.get("port"), () =>
    JsonLogger.log('online', {
        port: app.get("port"),
        env: app.get("env")}));