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
const Config_1 = require("./Config");
const logger_1 = require("@mazemasterjs/logger");
const fns = __importStar(require("./funcs"));
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Security_1 = __importDefault(require("./Security"));
// set constant utility references
const log = logger_1.Logger.getInstance();
const config = Config_1.Config.getInstance();
const security = Security_1.default.getInstance();
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
exports.generateDocs = (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    const minRole = Enums_1.USER_ROLES.INSTRUCTOR;
    if (!security.userHasRole(req.header('Authorization'), minRole)) {
        log.debug(__filename, req.path, 'User is not authorized.');
        return res.status(401).send(`Unauthorized Access - You must have at least the ${Enums_1.USER_ROLES[minRole]} role to ride this ride.`);
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
    }
    else {
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
exports.countDocs = (req, res, forceColName) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    const minRole = Enums_1.USER_ROLES.USER;
    if (!security.userHasRole(req.header('Authorization'), minRole)) {
        log.debug(__filename, req.path, 'User is not authorized.');
        return res.status(401).send(`Unauthorized Access - You must have at least the ${Enums_1.USER_ROLES[minRole]} role to ride this ride.`);
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
exports.getDocs = (req, res, forceColName) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    const minRole = Enums_1.USER_ROLES.ASSISTANT;
    if (!security.userHasRole(req.header('Authorization'), minRole)) {
        log.debug(__filename, req.path, 'User is not authorized.');
        return res.status(401).send(`Unauthorized Access - You must have at least the ${Enums_1.USER_ROLES[minRole]} role to ride this ride.`);
    }
    const colName = forceColName ? forceColName : svcColName;
    fns
        .getDocs(colName, req)
        .then(docs => {
        if (docs.length === 0) {
            res.status(404).json();
        }
        else {
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
exports.insertDoc = (req, res, forceColName) => {
    const minRole = Enums_1.USER_ROLES.ASSISTANT;
    if (!security.userHasRole(req.header('Authorization'), minRole)) {
        log.debug(__filename, req.path, 'User is not authorized.');
        return res.status(401).send(`Unauthorized Access - You must have at least the ${Enums_1.USER_ROLES[minRole]} role to ride this ride.`);
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
exports.updateDoc = (req, res, forceColName) => {
    const minRole = Enums_1.USER_ROLES.USER;
    if (!security.userHasRole(req.header('Authorization'), minRole)) {
        log.debug(__filename, req.path, 'User is not authorized.');
        return res.status(401).send(`Unauthorized Access - You must have at least the ${Enums_1.USER_ROLES[minRole]} role to ride this ride.`);
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
exports.deleteDoc = (req, res, forceColName) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    const minRole = Enums_1.USER_ROLES.ASSISTANT;
    if (!security.userHasRole(req.header('Authorization'), minRole)) {
        log.debug(__filename, req.path, 'User is not authorized.');
        return res.status(401).send(`Unauthorized Access - You must have at least the ${Enums_1.USER_ROLES[minRole]} role to ride this ride.`);
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
    }
    else {
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
exports.getServiceDoc = (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    const minRole = Enums_1.USER_ROLES.USER;
    if (!security.userHasRole(req.header('Authorization'), minRole)) {
        log.debug(__filename, req.path, 'User is not authorized.');
        return res.status(401).send(`Unauthorized Access - You must have at least the ${Enums_1.USER_ROLES[minRole]} role to ride this ride.`);
    }
    res.status(200).json(config.Service);
};
/**
 * Generates a maze with the given parameters and returns it as JSON
 *
 * @param req
 * @param res
 */
exports.generateMaze = (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    const minRole = Enums_1.USER_ROLES.USER;
    if (!security.userHasRole(req.header('Authorization'), minRole)) {
        log.debug(__filename, req.path, 'User is not authorized.');
        return res.status(401).send(`Unauthorized Access - You must have at least the ${Enums_1.USER_ROLES[minRole]} role to ride this ride.`);
    }
    const height = parseInt(req.params.height, 10);
    const width = parseInt(req.params.width, 10);
    const challenge = parseInt(req.params.challenge, 10);
    const name = req.params.name;
    const seed = req.params.seed;
    try {
        const maze = new Maze_1.default().generate(height, width, challenge, name, seed);
        const maze2 = new Maze_1.default().generate(3, 3, 3, 'Test', 'Test');
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
 * Responds with 404 and help message.
 *
 * @param req
 * @param res
 */
exports.unhandledRoute = (req, res) => {
    log.warn(__filename, `Route -> ${req.method} -> ${req.url}`, 'Unhandled route, returning 404.');
    res.status(404).json({
        status: '404',
        message: `${req.method} route not found, check your HTTP Method? See ${config.Service.BaseUrl}service for detailed documentation.`,
    });
};
//# sourceMappingURL=routes.js.map