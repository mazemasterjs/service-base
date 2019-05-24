import * as sFn from './sharedFuncs';
import * as sRt from './sharedRoutes';
import Config from '../Config';
import DatabaseManager from '@mazemasterjs/database-manager/DatabaseManager';
import express from 'express';
import { Logger } from '@mazemasterjs/logger';

export const router = express.Router();

// set module instance references
const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();

// declare dbMan - initialized during startup
let dbMan: DatabaseManager;

/**
 * This just assigns mongo the instance of DatabaseManager.  We shouldn't be
 * able to get here without a database connection and existing instance, but
 * we'll do some logging / error checking anyway.
 */
DatabaseManager.getInstance()
  .then(instance => {
    dbMan = instance;
    log.info(__filename, 'DatabaseManager.getInstance()', 'DatabaseManager is ready for use.');
  })
  .catch(err => {
    log.error(__filename, 'DatabaseManager.getInstance()', 'Error getting DatabaseManager instance ->', err);
  });

// respond with the config.Service document
router.get('/service', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  res.status(200).json(config.Service);
});

router.get('/count', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sRt.countDocs(config.MONGO_COL_SCORES, req, res);
});

// respond with the requested documents
router.get('/get', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sRt.getDocs(config.MONGO_COL_SCORES, req, res);
});

// forward standard insert request to sharedRoutes module
router.put('/insert', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sRt.insertDoc(config.MONGO_COL_SCORES, req, res);
});

// forward standard update request to sharedRoutes module
router.put('/update', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sRt.updateDoc(config.MONGO_COL_SCORES, req, res);
});

// forward standard delete request to sharedRoutes module
router.delete('/delete/:scoreId', (req, res) => {
  const docId = req.params.scoreId;
  sRt.deleteDoc(config.MONGO_COL_SCORES, docId, req, res);
});

// map the live/ready probes
router.get('/probes/live', sRt.livenessProbe);
router.get('/probes/ready', sRt.readinessProbe);

// capture all unhandled routes
router.get('/*', sRt.unhandledRoute);
router.put('/*', sRt.unhandledRoute);
router.delete('/*', sRt.unhandledRoute);
router.post('/*', sRt.unhandledRoute);

// expose router as module
export default router;
