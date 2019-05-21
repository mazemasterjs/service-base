"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = __importDefault(require("body-parser"));
const logger_1 = require("@mazemasterjs/logger");
// import { mazeRouter } from './routes/mazeRoutes';
// import { scoreRouter } from './routes/scoreRoutes';
// import { teamRouter } from './routes/teamRoutes';
// import { trophyRouter } from './routes/trophyRoutes';
const probeRouter_1 = require("./routes/probeRouter");
const DatabaseManager_1 = __importDefault(require("@mazemasterjs/database-manager/DatabaseManager"));
const cors_1 = __importDefault(require("cors"));
const Config_1 = __importDefault(require("./Config"));
const os_1 = require("os");
// load config
const config = new Config_1.default();
// get and configure logger
const log = logger_1.Logger.getInstance();
log.LogLevel = config.LOG_LEVEL;
// create express app
const app = express_1.default();
// prep reference for express server
let httpServer;
// prep reference for
let dbMan;
// load service's routes module
let svcRoutes = undefined;
/**
 * APPLICATION ENTRY POINT
 */
function startService() {
    return __awaiter(this, void 0, void 0, function* () {
        log.info(__filename, 'startService()', 'Opening database connection...');
        yield DatabaseManager_1.default.getInstance()
            .then(instance => {
            dbMan = instance;
            log.debug(__filename, 'startService()', 'Database connection ready, launch Express server.');
            launchExpress();
        })
            .catch(err => {
            log.error(__filename, 'startService()', 'Unable to connect to database.', err);
            doShutdown();
        });
    });
}
/**
 * Starts up the express server
 */
function launchExpress() {
    return __awaiter(this, void 0, void 0, function* () {
        log.debug(__filename, 'launchExpress()', 'Configuring express HTTPServer...');
        // allow cross-origin-resource-sharing
        app.use(cors_1.default());
        // enable http compression middleware
        app.use(compression_1.default());
        // enable bodyParser middleware for json
        app.use(body_parser_1.default.urlencoded({ extended: true }));
        // have to do a little dance around bodyParser.json() to verify request body so that
        // errors can be captured, logged, and responded to cleanly
        app.use((req, res, next) => {
            body_parser_1.default.json({
                verify: addReqBody,
            })(req, res, err => {
                if (err) {
                    log.error(__filename, 'app.bodyParser.json()', 'Error encountered while parsing json body.', err);
                    res.status(500).json({ status: '400', message: `Unable to parse JSON Body : ${err.name} - ${err.message}` });
                    return;
                }
                else {
                    log.trace(__filename, `bodyParser(${req.url}, res, next).json`, 'bodyParser.json() completed successfully.');
                }
                next();
            });
        });
        // set up the probes router (live/ready checks)
        log.info(__filename, 'launchExpress()', 'Loading probeRouter...');
        app.use(config.Service.BaseUrl + '/probes', probeRouter_1.probeRouter);
        log.info(__filename, 'launchExpress()', '    ... probeRouter loaded.');
        log.warn(__filename, 'startExpress()', `Loading module: ./routes/${config.Service.Name}Routes`);
        let svcRoutes = yield Promise.resolve().then(() => __importStar(require(`./routes/${config.Service.Name}Routes`))).then(mod => {
            return mod;
        });
        app.use(config.Service.BaseUrl, svcRoutes);
        // catch-all for unhandled requests
        app.get('/*', (req, res) => {
            log.debug(__filename, req.url, 'Invalid Route Requested -> ' + req.url);
            res.status(404).json({
                status: '404',
                message: 'Route not found: ' + req.path,
            });
        });
        // and start the httpServer - starts the service
        httpServer = app.listen(config.HTTP_PORT, () => {
            // sever is now listening - live probe should be active, but ready probe must wait for routes to be mapped.
            log.info(__filename, 'launchExpress()', `http://${os_1.hostname}:${config.HTTP_PORT}${config.Service.BaseUrl} -> Service is now LIVE, and READY!'`);
        });
    });
}
/**
 * Called by bodyParser.json() to allow handling of JSON errors in submitted
 * put/post document bodies.
 *
 * @param req
 * @param res
 * @param buf
 */
function addReqBody(req, res, buf) {
    req.body = buf.toString();
}
/**
 * Watch for SIGINT (process interrupt signal) and trigger shutdown
 */
process.on('SIGINT', function onSigInt() {
    // all done, close the db connection
    log.force(__filename, 'onSigInt()', 'Got SIGINT - Exiting application...');
    doShutdown();
});
/**
 * Watch for SIGTERM (process terminate signal) and trigger shutdown
 */
process.on('SIGTERM', function onSigTerm() {
    // all done, close the db connection
    log.force(__filename, 'onSigTerm()', 'Got SIGTERM - Exiting application...');
    doShutdown();
});
/**
 * Gracefully shut down the service
 */
function doShutdown() {
    log.force(__filename, 'doShutDown()', 'Service shutdown commenced.');
    if (dbMan) {
        log.force(__filename, 'doShutDown()', 'Closing DB connections...');
        dbMan.disconnect();
    }
    if (httpServer) {
        log.force(__filename, 'doShutDown()', 'Shutting down HTTPServer...');
        httpServer.close();
    }
    log.force(__filename, 'doShutDown()', 'Exiting process...');
    process.exit(0);
}
// Let's light the tires and kick the fires...
startService();
//# sourceMappingURL=service.js.map