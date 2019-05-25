import { Request, Response } from 'express';
import { ServiceConfig } from './ServiceConfig';
import { Logger } from '@mazemasterjs/logger';
import * as sFn from './sharedFuncs';

// set constant utility references
const log = Logger.getInstance();
const config = ServiceConfig.getInstance();
const svcColName = getSvcColName();

/**
 * Returns the collection name tied to the given service name
 *
 * @param svcName - The name of the service to return collection mapping for
 * @returns string - The name of the collection mapped to svcName
 */
function getSvcColName(): string {
  switch (config.Service.Name) {
    case 'maze': {
      return config.MONGO_COL_MAZES;
    }
    case 'team': {
      return config.MONGO_COL_TEAMS;
    }
    case 'score': {
      return config.MONGO_COL_SCORES;
    }
    case 'trophy': {
      return config.MONGO_COL_TROPHIES;
    }
    default: {
      return 'SERVICE_COLLECTION_NOT_MAPPED';
    }
  }
}

export const generateDocs = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  let dataFile;

  switch (svcColName) {
    case config.MONGO_COL_MAZES: {
      dataFile = config.DATA_FILE_MAZES;
      break;
    }
    case config.MONGO_COL_TROPHIES: {
      dataFile = config.DATA_FILE_TROPHIES;
      break;
    }
  }

  if (dataFile === undefined) {
    return res
      .status(400)
      .json({ status: '405 - Method Not Supported', message: `Service [ ${config.Service.Name} ] does not support default document generation.` });
  } else {
    sFn
      .generateDocs(svcColName, dataFile)
      .then(results => {
        res.status(200).json(results);
      })
      .catch(error => {
        res.status(500).json({ error: error.message });
      });
  }
};

/**
 * Responds with document count from the given collection
 *
 * @param colName string - the collection to delete the document from
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 */
export const countDocs = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .getCount(svcColName, req)
    .then(count => {
      res.status(200).json({ collection: svcColName, count });
    })
    .catch(err => {
      res.status(500).json({ collection: svcColName, error: err, message: err.message });
    });
};

/**
 * Responds with matching JSON documents from the given collection
 *
 * @param colName string - the collection to delete the document from
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 */
export const getDocs = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .getDocs(svcColName, req)
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
export const insertDoc = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .insertDoc(svcColName, req.body)
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
export const updateDoc = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  sFn
    .updateDoc(svcColName, req.body)
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
export const deleteDoc = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  const docId = req.params.docId;

  sFn
    .deleteDoc(svcColName, docId)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

/**
 * Respond with the service document describing the current service
 *
 * @param req
 * @param res
 */
export const getServiceDoc = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  res.status(200).json(config.Service);
};

/**
 * Readiness probe for K8s/OpenShift - response indicates service ready
 *
 * @param req
 * @param res
 */
export const readinessProbe = (req: Request, res: Response) => {
  log.trace(__filename, req.path, 'Handling request -> ' + req.url);
  res.status(200).json({ probeType: 'readiness', status: 'ready' });
};

/**
 * Readiness probe for K8s/OpenShift - response indicates service alive
 *
 * @param req
 * @param res
 */
export const livenessProbe = (req: Request, res: Response) => {
  log.trace(__filename, req.path, 'Handling request -> ' + req.url);
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
    message: `Route not found.  See ${config.Service.BaseUrl}\service for detailed documentation.`,
  });
};
