import { Request, Response } from 'express';
import { Config } from './Config';
import { Logger } from '@mazemasterjs/logger';
import * as fns from './funcs';
import Maze from '@mazemasterjs/shared-library/Maze';
import { USER_ROLES } from '@mazemasterjs/shared-library/Enums';
import Security from './Security';

// set constant utility references
const log = Logger.getInstance();
const config = Config.getInstance();
const security = Security.getInstance();
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
    case 'botcode': {
      return config.MONGO_COL_BOTCODE;
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
  const minRole = USER_ROLES.INSTRUCTOR;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
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
    fns
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
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 * @param forceColName string - optional - force action against a specific collection
 */
export const countDocs = (req: Request, res: Response, forceColName?: string) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }

  const colName = forceColName ? forceColName : svcColName;
  fns
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
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 * @param forceColName string - optional - force action against a specific collection
 */
export const getDocs = (req: Request, res: Response, forceColName?: string) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  const minRole = USER_ROLES.ASSISTANT;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }

  const colName = forceColName ? forceColName : svcColName;
  fns
    .getDocs(colName, req)
    .then(docs => {
      if (docs.length === 0) {
        res.status(404).json();
      } else {
        res.status(200).json(docs);
      }
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

/**
 * Responds with results of document insert activity.
 *
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 * @param forceColName string - optional - force action against a specific collection
 */
export const insertDoc = (req: Request, res: Response, forceColName?: string) => {
  const minRole = USER_ROLES.ASSISTANT;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  const colName = forceColName ? forceColName : svcColName;
  fns
    .insertDoc(colName, req.body)
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
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 * @param forceColName string - optional - force action against a specific collection
 */
export const updateDoc = (req: Request, res: Response, forceColName?: string) => {
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }

  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  const colName = forceColName ? forceColName : svcColName;
  fns
    .updateDoc(colName, req.body)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      res.status(500).json(err);
    });
};

/**
 * Responds with results of document delete activity.
 *
 * @param req Request - incoming HTTPRequest
 * @param res Response - outgoing HTTPResponse
 * @param forceColName string - optional - force action against a specific collection
 */
export const deleteDoc = (req: Request, res: Response, forceColName?: string) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);

  const minRole = USER_ROLES.ASSISTANT;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }

  const colName = forceColName ? forceColName : svcColName;
  const docId = colName === config.MONGO_COL_BOTCODE ? req.params.botId : req.params.docId;
  const version = req.params.version;

  // special handling for bot_code documents
  if (forceColName) {
    fns
      .deleteDoc(colName, docId, version)
      .then(result => {
        res.status(200).json(result);
      })
      .catch(err => {
        res.status(500).json(err);
      });
  } else {
    // standard documents aren't versioned
    fns
      .deleteDoc(colName, docId)
      .then(result => {
        res.status(200).json(result);
      })
      .catch(err => {
        res.status(500).json(err);
      });
  }
};

/**
 * Respond with the service document describing the current service
 *
 * @param req
 * @param res
 */
export const getServiceDoc = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }

  res.status(200).json(config.Service);
};

/**
 * Generates a maze with the given parameters and returns it as JSON
 *
 * @param req
 * @param res
 */
export const generateMaze = (req: Request, res: Response) => {
  log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
  const height: number = parseInt(req.params.height, 10);
  const width: number = parseInt(req.params.width, 10);
  const challenge: number = parseInt(req.params.challenge, 10);
  const name: string = req.params.name;
  const seed: string = req.params.seed;

  try {
    const maze: Maze = new Maze().generate(height, width, challenge, name, seed);
    const maze2: Maze = new Maze().generate(3, 3, 3, 'Test', 'Test');
    res.status(200).json(maze);
  } catch (err) {
    res.status(500).json({ status: '500 - Server Error', error: err.message });
  }
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
 * Responds with 404 and help message.
 *
 * @param req
 * @param res
 */
export const unhandledRoute = (req: Request, res: Response) => {
  log.warn(__filename, `Route -> ${req.method} -> ${req.url}`, 'Unhandled route, returning 404.');
  res.status(404).json({
    status: '404',
    message: `${req.method} route not found, check your HTTP Method? See ${config.Service.BaseUrl}service for detailed documentation.`,
  });
};
