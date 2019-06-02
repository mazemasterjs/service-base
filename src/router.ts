import * as routes from './routes';
import express from 'express';
import Config from './Config';

export const router = express.Router();

// load the service config
const config = Config.getInstance();

// map all of the common routes
router.get('/service', routes.getServiceDoc);
router.get('/count', routes.countDocs);
router.get('/get', routes.getDocs);
router.put('/insert', routes.insertDoc);
router.put('/update', routes.updateDoc);
router.delete('/delete/:docId', routes.deleteDoc);

// maze-specific routes
if (config.Service.Name === 'maze') {
  router.get('/regenerate-default-docs', routes.generateDocs);
  router.get('/generate/:height/:width/:challenge/:name/:seed', routes.generateMaze);
}

// trophy-specific routes
if (config.Service.Name === 'trophy') {
  router.get('/regenerate-default-docs', routes.generateDocs);
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
