import * as sf from './sharedFuncs';
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

/**
 * Handles undefined routes
 */
let unhandledRoute = (req: express.Request, res: express.Response) => {
  log.warn(__filename, `Route -> [${req.method} -> ${req.url}]`, 'Unhandled route, returning 404.');
  res.status(404).json({
    status: '404',
    message: `Route not found.  See ${config.Service.BaseUrl}/service for detailed documentation.`,
  });
};

// respond with the config.Service document
router.get('/service', (req, res) => {
  log.debug(__filename, req.url, 'Handling request -> ' + req.path);
  res.status(200).json(config.Service);
});

// respond with the document count of the scores collection
router.get('/get/count', (req, res) => {
  log.debug(__filename, req.url, 'Handling request -> ' + req.path);
  sf.getCount(config.MONGO_COL_SCORES, req).then(count => {
    res.status(200).json({ collection: `${config.MONGO_COL_SCORES}`, count });
  });
});

// respond with the requested documents
router.get('/get', (req, res) => {
  log.debug(__filename, req.url, 'Handling request -> ' + req.path);
  sf.getDocs(config.MONGO_COL_SCORES, req)
    .then(scores => {
      res.status(200).json(scores);
    })
    .catch(err => {
      res.status(500).json(err);
    });
});

// insert the document body into scores collection
router.put('/insert', (req, res) => {
  log.debug(__filename, req.url, 'Handling request -> ' + req.path);
  sf.insertDoc(config.MONGO_COL_SCORES, req)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      res.status(500).json(err);
    });
});

// update existing document body in scores collection
router.put('/update', (req, res) => {
  log.debug(__filename, req.url, 'Handling request -> ' + req.path);
  sf.updateDoc(config.MONGO_COL_SCORES, req)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      res.status(500).json(err);
    });
});

// delete a document from the scores collection that matches the given id
router.delete('/delete/:scoreId', (req, res) => {
  log.debug(__filename, req.url, 'Handling request -> ' + req.path);
  let docId = req.params.scoreId;
  sf.deleteDoc(config.MONGO_COL_SCORES, docId, req)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      res.status(500).json(err);
    });
});

// capture all unhandled routes
router.get('/*', unhandledRoute);
router.put('/*', unhandledRoute);
router.delete('/*', unhandledRoute);
router.post('/*', unhandledRoute);

// expose router as module
export default router;
