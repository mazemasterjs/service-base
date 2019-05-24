import { Request, Response } from 'express';
import { Config } from '../Config';
import { Logger } from '@mazemasterjs/logger';
import * as sFn from './sharedFuncs';

// set constant utility references
const log = Logger.getInstance();
const config = Config.getInstance();

/**
 * Responds with document count from the given collection
 *
 * @param colName string - the collection to delete the document from
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 */
export const countDocs = (colName: string, req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .getCount(colName, req)
    .then(count => {
      res.status(200).json({ collection: colName, count });
    })
    .catch(err => {
      res.status(500).json({ collection: colName, error: err, message: err.message });
    });
};

/**
 * Responds with matching JSON documents from the given collection
 *
 * @param colName string - the collection to delete the document from
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 */
export const getDocs = (colName: string, req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .getDocs(colName, req)
    .then(docs => {
      res.status(200).json(docs);
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

/**
 * Responds with results of document insert activity.
 *
 * @param colName string - the collection to delete the document from
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 */
export const insertDoc = (colName: string, req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .insertDoc(colName, req)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

/**
 * Responds with results of document update activity.
 *
 * @param colName string - the collection to delete the document from
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 */
export const updateDoc = (colName: string, req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .updateDoc(colName, req)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

/**
 * Responds with results of document update activity.
 *
 * @param colName string - the collection to delete the document from
 * @param docId string - mmjs-specific document ID
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 */
export const deleteDoc = (colName: string, docId: string, req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .deleteDoc(colName, docId, req)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

/**
 * Readiness probe for K8s/OpenShift - response indicates service ready
 *
 * @param req
 * @param res
 */
export const readinessProbe = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  res.status(200).json({ probeType: 'readiness', status: 'ready' });
};

/**
 * Readiness probe for K8s/OpenShift - response indicates service alive
 *
 * @param req
 * @param res
 */
export const livenessProbe = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  res.status(200).json({ probeType: 'liveness', status: 'alive' });
};

/**
 * Responds with 404 and help message.
 *
 * @param req
 * @param res
 */
export const unhandledRoute = (req: Request, res: Response) => {
  log.warn(__filename, `Route -> [${req.method} -> ${req.url}]`, 'Unhandled route, returning 404.');
  res.status(404).json({
    status: '404',
    message: `Route not found.  See ${config.Service.BaseUrl}/service for detailed documentation.`,
  });
};
