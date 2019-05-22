"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_1 = require("@mazemasterjs/logger");
const DatabaseManager_1 = __importDefault(require("@mazemasterjs/database-manager/DatabaseManager"));
const sf = __importStar(require("./sharedFuncs"));
const Config_1 = __importDefault(require("../Config"));
exports.router = express_1.default.Router();
// set module instance references
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
// declare useful constants
const ROUTE_PATH = '/api/score';
// declare dbMan - initialized during startup
let dbMan;
/**
 * This just assigns mongo the instance of DatabaseManager.  We shouldn't be
 * able to get here without a database connection and existing instance, but
 * we'll do some logging / error checking anyway.
 */
DatabaseManager_1.default.getInstance()
    .then(instance => {
    dbMan = instance;
    log.info(__filename, 'DatabaseManager.getInstance()', 'DatabaseManager is ready for use.');
})
    .catch(err => {
    log.error(__filename, 'DatabaseManager.getInstance()', 'Error getting DatabaseManager instance ->', err);
});
/**
 * Handles undefined routes
 */
let unhandledRoute = (req, res) => {
    log.warn(__filename, `Route -> [${req.method} -> ${req.url}]`, 'Unhandled route, returning 404.');
    res.status(404).json({
        status: '404',
        message: `Route not found.  See ${ROUTE_PATH}/service for detailed documentation.`,
    });
};
// respond with the config.Service document
exports.router.get('/service', (req, res) => {
    log.debug(__filename, req.url, 'Handling request -> ' + req.path);
    res.status(200).json(config.Service);
});
// respond with the document count of the scores collection
exports.router.get('/get/count', (req, res) => {
    log.debug(__filename, req.url, 'Handling request -> ' + req.path);
    sf.getCount(config.MONGO_COL_SCORES, req).then(count => {
        res.status(200).json({ collection: `${config.MONGO_COL_SCORES}`, count });
    });
});
// respond with the requested documents
exports.router.get('/get', (req, res) => {
    log.debug(__filename, req.url, 'Handling request -> ' + req.path);
    sf.getDocs(config.MONGO_COL_SCORES, req)
        .then(scores => {
        res.status(200).json(scores);
    })
        .catch(err => {
        res.status(500).json(err);
    });
});
// Route -> http.put mappings
exports.router.put('/insert', (req, res) => {
    log.debug(__filename, req.url, 'Handling request -> ' + req.path);
    sf.insertDoc(config.MONGO_COL_SCORES, req)
        .then(result => {
        res.status(200).json(result);
    })
        .catch(err => {
        res.status(200).json(err);
    });
});
exports.router.put('/update', (req, res) => {
    log.debug(__filename, req.url, 'Handling request -> ' + req.path);
    sf.updateDoc(config.MONGO_COL_SCORES, req)
        .then(result => {
        res.status(200).json(result);
    })
        .catch(err => {
        res.status(200).json(err);
    });
});
// Route -> http.delete mappings
exports.router.delete('/delete/:scoreId', (req, res) => {
    log.debug(__filename, req.url, 'Handling request -> ' + req.path);
    let docId = req.params.scoreId;
    sf.deleteDoc(config.MONGO_COL_SCORES, docId, req)
        .then(result => {
        res.status(200).json(result);
    })
        .catch(err => {
        res.status(200).json(err);
    });
});
// capture all unhandled routes
exports.router.get('/*', unhandledRoute);
exports.router.put('/*', unhandledRoute);
exports.router.delete('/*', unhandledRoute);
exports.router.post('/*', unhandledRoute);
// expose router as module
exports.default = exports.router;
//# sourceMappingURL=scoreRouter.js.map