import * as sRt from './sharedRoutes';
import express from 'express';
import ServiceConfig from './ServiceConfig';

export const commonRouter = express.Router();

// load the service config
const config = ServiceConfig.getInstance();

// map all of the common routes
commonRouter.get('/service', sRt.getServiceDoc);
commonRouter.get('/count', sRt.countDocs);
commonRouter.get('/get', sRt.getDocs);
commonRouter.put('/insert', sRt.insertDoc);
commonRouter.put('/update', sRt.updateDoc);
commonRouter.delete('/delete/:docId', sRt.deleteDoc);

// maze-specific routes
if (config.Service.Name === 'maze') {
  commonRouter.get('/regenerate-default-docs', sRt.generateDocs);
  commonRouter.get('/generate/:height/:width/:challenge/:name/:seed', sRt.generateMaze);
}

// trophy-specific routes
if (config.Service.Name === 'trophy') {
  commonRouter.get('/regenerate-default-docs', sRt.generateDocs);
}

// map the live/ready probes
commonRouter.get('/probes/live', sRt.livenessProbe);
commonRouter.get('/probes/ready', sRt.readinessProbe);

// capture all unhandled requests
commonRouter.get('/*', sRt.unhandledRoute);
commonRouter.put('/*', sRt.unhandledRoute);
commonRouter.delete('/*', sRt.unhandledRoute);
commonRouter.post('/*', sRt.unhandledRoute);

// expose router as module
export default commonRouter;
