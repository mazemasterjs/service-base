import express from 'express';
import { commonRouter } from './router';
import compression from 'compression';
import bodyParser from 'body-parser';
import { Logger } from '@mazemasterjs/logger';
import DatabaseManager from '@mazemasterjs/database-manager/DatabaseManager';
import { Server } from 'http';
import cors from 'cors';
import Config from './Config';
import { hostname } from 'os';

// load config
const config = Config.getInstance();

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
  app.use(config.Service.BaseUrl, commonRouter);

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
