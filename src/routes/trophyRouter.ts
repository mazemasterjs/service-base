import * as sFn from './sharedFuncs';
import * as sRt from './sharedRoutes';
import path from 'path';
import fs from 'fs';
import Config from '../Config';
import DatabaseManager from '@mazemasterjs/database-manager/DatabaseManager';
import express from 'express';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import { Logger } from '@mazemasterjs/logger';

export const router = express.Router();

// set module instance references
const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();

// declare dbMan - initialized during startup
let dbMan: DatabaseManager;

/**
 * This just assigns mongo the instance of DatabaseManager. We shouldn't be
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
 * Regenerates (delete/insert) the default trophy list
 *
 * @param req
 * @param res
 */
const genTrophies = async (req: express.Request, res: express.Response) => {
  log.debug(__filename, req.url, 'Handling request -> ' + req.path);

  // make sure the file exists...
  if (!fs.existsSync(config.DATA_FILE_TROPHIES)) {
    log.warn(__filename, 'genTrophies(req, res)', 'Cannot continue, file not found: ' + config.DATA_FILE_TROPHIES);
    return res.status(500).json({ error: 'File Not Found', message: 'Cannot continue, file not found: ' + config.DATA_FILE_TROPHIES });
  }

  // and walk through the file's contents
  const data = JSON.parse(fs.readFileSync(config.DATA_FILE_TROPHIES, 'UTF-8'));
  for (const tdata of data.trophies) {
    const trophy: Trophy = new Trophy(tdata);

    // first try to delete the trophy (it may not exist, but that's ok)
    await sFn
      .deleteDoc(config.MONGO_COL_TROPHIES, trophy.Id, req)
      .then(result => {
        if (result.deletedCount && result.deletedCount > 0) {
          log.debug(__filename, 'genTrophies(req, res)', `${result.deletedCount} trophy document(s) with id=${trophy.Id} deleted`);
        } else {
          log.debug(__filename, 'genTrophies(req, res)', `Trophy (id=${trophy.Id}) could not be deleted (may not exist).`);
        }
      })
      .catch((err: any) => {
        log.warn(__filename, 'genTrophies(req, res)', `Error deleting trophy (id=${trophy.Id}) -> ${err.message}`);
      });

    // then insert the trophy from our json file
    await sFn
      .insertDoc(config.MONGO_COL_TROPHIES, req)
      .then(result => {
        if (result.insertedCount > 0) {
          log.debug(__filename, 'genTrophies(req, res)', `Trophy (id=${trophy.Id}) inserted.`);
        } else {
          log.warn(__filename, 'genTrophies(req, res)', `insertedCount is 0. Trophy (id=${trophy.Id}) was NOT inserted.`);
        }
      })
      .catch(err => {
        log.warn(__filename, 'genTrophies(req, res)', `Error inserting trophy (id=${trophy.Id}) -> ${err.message}`);
      });
  }

  await sFn
    .getCount(config.MONGO_COL_TROPHIES, req)
    .then(count => {
      log.debug(__filename, 'genTrophies(req, res)', 'Trophy Document Count=' + count);
      res.status(200).json({ message: 'Default trophies generated.', collection: config.MONGO_COL_TROPHIES, 'trophy-count': count });
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

// respond with the config.Service document
router.get('/service', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  res.status(200).json(config.Service);
});

router.get('/count', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sRt.countDocs(config.MONGO_COL_TROPHIES, req, res);
});

// respond with the requested documents
router.get('/get', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sRt.getDocs(config.MONGO_COL_TROPHIES, req, res);
});

// regenerate the default trophy documents (delete / insert)
router.put('/regenerate-default-trophies', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  genTrophies(req, res);
});

// forward standard insert request to sharedRoutes module
router.put('/insert', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sRt.insertDoc(config.MONGO_COL_TROPHIES, req, res);
});

// forward standard update request to sharedRoutes module
router.put('/update', (req, res) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sRt.updateDoc(config.MONGO_COL_TROPHIES, req, res);
});

// forward standard delete request to sharedRoutes module
router.delete('/delete/:trophyId', (req, res) => {
  const docId = req.params.trophyId;
  sRt.deleteDoc(config.MONGO_COL_TROPHIES, docId, req, res);
});

// capture all unhandled routes
router.get('/*', sRt.unhandledRoute);
router.put('/*', sRt.unhandledRoute);
router.delete('/*', sRt.unhandledRoute);
router.post('/*', sRt.unhandledRoute);

// expose router as module
export default router;
