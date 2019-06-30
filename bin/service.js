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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router_1 = require("./router");
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = __importDefault(require("body-parser"));
const logger_1 = require("@mazemasterjs/logger");
const DatabaseManager_1 = __importDefault(require("@mazemasterjs/database-manager/DatabaseManager"));
const express_basic_auth_1 = __importDefault(require("express-basic-auth"));
const cors_1 = __importDefault(require("cors"));
const Config_1 = __importDefault(require("./Config"));
const object_hash_1 = require("object-hash");
const os_1 = require("os");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Security_1 = require("./Security");
// load config & security singletons
const config = Config_1.default.getInstance();
const security = Security_1.Security.getInstance();
// get and configure logger
const log = logger_1.Logger.getInstance();
log.LogLevel = config.LOG_LEVEL;
// create express app
const app = express_1.default();
// prep reference for express server
let httpServer;
// prep reference for
let dbMan;
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
        // set up the basic auth middleware
        app.use(express_basic_auth_1.default({
            authorizer: authUser,
            authorizeAsync: true,
            unauthorizedResponse: authFailed,
        }));
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
        log.force(__filename, 'launchExpress()', `SERVICE CONFIGURATION --> ${config.Service.Name} <--`);
        app.use(config.Service.BaseUrl, router_1.router);
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
            log.force(__filename, 'launchExpress()', `Express is listening -> http://${os_1.hostname}:${config.HTTP_PORT}${config.Service.BaseUrl}`);
            log.force(__filename, 'launchExpress()', `[ ${config.Service.Name.toUpperCase()}-SERVICE ] is now LIVE and READY!'`);
        });
    });
}
/**
 * Attempts to authenticate the given user against the users collection
 *
 * @param userName
 * @param password
 * @param callback
 */
function authUser(userName, password, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `authUser(${userName}, [password-masked])`;
        log.debug(__filename, method, `Authenticating credentials...`);
        const userCreds = security.getUserCreds(userName);
        if (userCreds !== null) {
            log.debug(__filename, method, `User credentials cached. User role is: ${Enums_1.USER_ROLES[userCreds.role]}`);
            callback(null, true);
            return;
        }
        // special case: case-insensitive userName query
        const userDoc = yield dbMan.getDocument(config.MONGO_COL_USERS, { userName: new RegExp('^' + userName + '$', 'i') });
        if (userDoc) {
            if (userDoc.pwHash === object_hash_1.MD5(password)) {
                log.debug(__filename, method, `Authentication Succeeeded: ${userDoc.userName} has role ${Enums_1.USER_ROLES[userDoc.role]}`);
                // update the user's last login time
                userDoc.lastLogin = Date.now();
                dbMan.updateDocument(config.MONGO_COL_USERS, { userName }, userDoc);
                // stash the user record in the the authed user cache
                security.cacheAuthedUser(userDoc);
                // return success to auth middleware
                callback(null, true);
            }
            else {
                // return failure to auth middleware
                log.debug(__filename, method, 'Authentication Failed: Invalid password: ' + userDoc.userName);
                callback(null, false);
            }
        }
        else {
            // return failure to auth middleware
            log.debug(__filename, method, 'Authentication Failed: User not found');
            callback(null, false);
        }
    });
}
/**
 * Returns a simple auth failure message
 *
 * @param req
 */
function authFailed(req) {
    if (req.auth) {
        return `Authentication Failed. Access denied.`;
    }
    else {
        return 'Missing credentials. Basic authorization header is required. Access denied.';
    }
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