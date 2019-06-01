"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ServiceConfig_1 = require("./ServiceConfig");
const logger_1 = require("@mazemasterjs/logger");
const sFn = __importStar(require("./sharedFuncs"));
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
// set constant utility references
const log = logger_1.Logger.getInstance();
const config = ServiceConfig_1.ServiceConfig.getInstance();
const svcColName = getSvcColName();
/**
 * Returns the collection name tied to the given service name
 *
 * @param svcName - The name of the service to return collection mapping for
 * @returns string - The name of the collection mapped to svcName
 */
function getSvcColName() {
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
exports.generateDocs = (req, res) => {
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
    }
    else {
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
exports.countDocs = (req, res) => {
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
exports.getDocs = (req, res) => {
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
exports.insertDoc = (req, res) => {
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
exports.updateDoc = (req, res) => {
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
exports.deleteDoc = (req, res) => {
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
exports.getServiceDoc = (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    res.status(200).json(config.Service);
};
/**
 * Readiness probe for K8s/OpenShift - response indicates service ready
 *
 * @param req
 * @param res
 */
exports.readinessProbe = (req, res) => {
    log.trace(__filename, req.path, 'Handling request -> ' + req.url);
    res.status(200).json({ probeType: 'readiness', status: 'ready' });
};
/**
 * Generates a maze with the given parameters and returns it as JSON
 *
 * @param req
 * @param res
 */
exports.generateMaze = (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    const height = req.params.height;
    const width = req.params.width;
    const challenge = req.params.challenge;
    const name = req.params.name;
    const seed = req.params.seed;
    try {
        const maze = new Maze_1.default().generate(height, width, challenge, name, seed);
        res.status(200).json(maze);
    }
    catch (err) {
        res.status(500).json({ status: '500 - Server Error', error: err.message });
    }
};
/**
 * Readiness probe for K8s/OpenShift - response indicates service alive
 *
 * @param req
 * @param res
 */
exports.livenessProbe = (req, res) => {
    log.trace(__filename, req.path, 'Handling request -> ' + req.url);
    res.status(200).json({ probeType: 'liveness', status: 'alive' });
};
/**
 * Responds with 404 and help message.
 *
 * @param req
 * @param res
 */
exports.unhandledRoute = (req, res) => {
    log.warn(__filename, `Route -> [${req.method} -> ${req.url}]`, 'Unhandled route, returning 404.');
    res.status(404).json({
        status: '404',
        message: `Route not found.  See ${config.Service.BaseUrl}\service for detailed documentation.`,
    });
};
//# sourceMappingURL=sharedRoutes.js.map