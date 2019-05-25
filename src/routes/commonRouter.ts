import * as sRt from './sharedRoutes';
import express from 'express';

export const commonRouter = express.Router();

// map all of the common routes
commonRouter.get('/service', sRt.getServiceDoc);
commonRouter.get('/count', sRt.countDocs);
commonRouter.get('/get', sRt.getDocs);
commonRouter.put('/insert', sRt.insertDoc);
commonRouter.put('/update', sRt.updateDoc);
commonRouter.delete('/delete/:docId', sRt.deleteDoc);
commonRouter.get('/regenerate-default-docs', sRt.generateDocs);

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
