import * as routes from './routes';
import express from 'express';
import Config from './Config';

export const router = express.Router();

// load the service config
const config = Config.getInstance();

// map all of the common routes
router.get('/service', routes.getServiceDoc);

router.get('/count', (req, res) => routes.countDocs(req, res));
router.get('/get', (req, res) => routes.getDocs(req, res));
router.put('/insert', (req, res) => routes.insertDoc(req, res));
router.put('/update', (req, res) => routes.updateDoc(req, res));
router.delete('/delete/:docId', (req, res) => routes.deleteDoc(req, res));

// maze-specific routes
if (config.Service.Name === 'maze') {
  router.get('/regenerate-default-docs', routes.generateDocs);
  router.get('/generate/:height/:width/:challenge/:name/:seed', routes.generateMaze);
}

// trophy-specific routes
if (config.Service.Name === 'trophy') {
  router.get('/regenerate-default-docs', routes.generateDocs);
}

// score-specific routes
if (config.Service.Name === 'score') {
  router.get('/get/topScores', (req, res) => routes.topScores(req, res));
}

// team/bot-specific routes
if (config.Service.Name === 'team') {
  router.get('/count/botCode', (req, res) => routes.countDocs(req, res, config.MONGO_COL_BOTCODE));
  router.get('/get/botCode', (req, res) => routes.getDocs(req, res, config.MONGO_COL_BOTCODE));
  router.put('/insert/botCode', (req, res) => routes.insertDoc(req, res, config.MONGO_COL_BOTCODE));
  router.put('/update/botCode', (req, res) => routes.updateDoc(req, res, config.MONGO_COL_BOTCODE));
  router.delete('/delete/botCode/:botId/:version', (req, res) => routes.deleteDoc(req, res, config.MONGO_COL_BOTCODE));

  // user/auth
  router.get('/count/user', (req, res) => routes.countDocs(req, res, config.MONGO_COL_USERS));
  router.get('/get/user', (req, res) => routes.getDocs(req, res, config.MONGO_COL_USERS));
  router.put('/insert/user', (req, res) => routes.insertDoc(req, res, config.MONGO_COL_USERS));
  router.put('/update/user', (req, res) => routes.updateDoc(req, res, config.MONGO_COL_USERS));
  router.delete('/delete/user/:docId', (req, res) => routes.deleteDoc(req, res, config.MONGO_COL_USERS));
}

// map the live/ready probes
router.get('/probes/live', routes.livenessProbe);
router.get('/probes/ready', routes.readinessProbe);

// capture all unhandled requests
router.get('/*', routes.unhandledRoute);
router.put('/*', routes.unhandledRoute);
router.delete('/*', routes.unhandledRoute);
router.post('/*', routes.unhandledRoute);

// expose router as module
export default router;
