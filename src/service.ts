import express from 'express';
import { router } from './router';
import compression from 'compression';
import bodyParser from 'body-parser';
import { Logger } from '@mazemasterjs/logger';
import DatabaseManager from '@mazemasterjs/database-manager/DatabaseManager';
import { Server } from 'http';
import basicAuth from 'express-basic-auth';
import cors from 'cors';
import Config from './Config';
import { MD5 as hash } from 'object-hash';
import { hostname } from 'os';
import { USER_ROLES } from '@mazemasterjs/shared-library/Enums';
import { Security } from './Security';
import { IUser } from '@mazemasterjs/shared-library/Interfaces/IUser';

// load config & security singletons
const config = Config.getInstance();
const security = Security.getInstance();

// get and configure logger
const log = Logger.getInstance();
log.LogLevel = config.LOG_LEVEL;

// create express app
const app = express();

// prep reference for express server
let httpServer: Server;

// prep reference for
let dbMan: DatabaseManager;

/**
 * APPLICATION ENTRY POINT
 */
async function startService() {
  log.info(__filename, 'startService()', 'Opening database connection...');
  await DatabaseManager.getInstance()
    .then(instance => {
      dbMan = instance;
      log.debug(__filename, 'startService()', 'Database connection ready, launch Express server.');
      launchExpress();
    })
    .catch(err => {
      log.error(__filename, 'startService()', 'Unable to connect to database.', err);
      doShutdown();
    });
}

/**
 * Starts up the express server
 */
async function launchExpress() {
  log.debug(__filename, 'launchExpress()', 'Configuring express HTTPServer...');

  // allow cross-origin-resource-sharing
  app.use(cors());

  // enable http compression middleware
  app.use(compression());

  // set up the basic auth middleware

  app.use(
    basicAuth({
      authorizer: authUser,
      authorizeAsync: true,
      unauthorizedResponse: authFailed,
    }),
  );

  // enable bodyParser middleware for json
  app.use(bodyParser.urlencoded({ extended: true }));

  // have to do a little dance around bodyParser.json() to verify request body so that
  // errors can be captured, logged, and responded to cleanly
  app.use((req, res, next) => {
    bodyParser.json({
      verify: addReqBody,
    })(req, res, err => {
      if (err) {
        log.error(__filename, 'app.bodyParser.json()', 'Error encountered while parsing json body.', err);
        res.status(500).json({ status: '400', message: `Unable to parse JSON Body : ${err.name} - ${err.message}` });
        return;
      } else {
        log.trace(__filename, `bodyParser(${req.url}, res, next).json`, 'bodyParser.json() completed successfully.');
      }
      next();
    });
  });

  log.force(__filename, 'launchExpress()', `SERVICE CONFIGURATION --> ${config.Service.Name} <--`);
  app.use(config.Service.BaseUrl, router);

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
    log.force(__filename, 'launchExpress()', `Express is listening -> http://${hostname}:${config.HTTP_PORT}${config.Service.BaseUrl}`);
    log.force(__filename, 'launchExpress()', `[ ${config.Service.Name.toUpperCase()}-SERVICE ] is now LIVE and READY!'`);
  });
}

/**
 * Attempts to authenticate the given user against the users collection
 *
 * @param userName
 * @param password
 * @param callback
 */
async function authUser(userName: string, password: string, callback: any) {
  const method = `authUser(${userName}, [password-masked])`;
  log.debug(__filename, method, `Authenticating credentials...`);

  const userCreds: IUser | null = security.getUserCreds(userName);
  if (userCreds !== null) {
    if (userCreds.pwHash !== hash(password)) {
      log.debug(__filename, method, 'Authentication Failed: Invalid password: ' + userCreds.userName);
      security.evictCredentials(userCreds);
      callback(null, false);
      return;
    } else {
      log.debug(__filename, method, `User credentials cached. User role is: ${USER_ROLES[userCreds.role]}`);
      callback(null, true);
      return;
    }
  }

  // special case: case-insensitive userName query
  const userDoc: IUser = await dbMan.getDocument(config.MONGO_COL_USERS, { userName: new RegExp('^' + userName + '$', 'i') });

  if (userDoc) {
    if (userDoc.pwHash === hash(password)) {
      log.debug(__filename, method, `Authentication Succeeeded: ${userDoc.userName} has role ${USER_ROLES[userDoc.role]}`);

      // update the user's last login time
      userDoc.lastLogin = Date.now();
      dbMan.updateDocument(config.MONGO_COL_USERS, { userName }, userDoc);

      // stash the user record in the the authed user cache
      security.cacheAuthedUser(userDoc);

      // return success to auth middleware
      callback(null, true);
    } else {
      // return failure to auth middleware
      log.debug(__filename, method, 'Authentication Failed: Invalid password: ' + userDoc.userName);
      callback(null, false);
    }
  } else {
    // return failure to auth middleware
    log.debug(__filename, method, 'Authentication Failed: User not found');
    callback(null, false);
  }
}

/**
 * Returns a simple auth failure message
 *
 * @param req
 */
function authFailed(req: any) {
  if (req.auth) {
    log.debug(__filename, 'authFailed()', 'Auth Failed - Access Denied.');
    return `Authentication Failed. Access denied.`;
  } else {
    log.debug(__filename, 'authFailed()', 'Auth Failed - Missing Credentials.');
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
function addReqBody(req: express.Request, res: express.Response, buf: Buffer) {
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
