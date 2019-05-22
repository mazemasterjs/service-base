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
const sRt = __importStar(require("./sharedRoutes"));
const Config_1 = __importDefault(require("../Config"));
const DatabaseManager_1 = __importDefault(require("@mazemasterjs/database-manager/DatabaseManager"));
const express_1 = __importDefault(require("express"));
const logger_1 = require("@mazemasterjs/logger");
exports.router = express_1.default.Router();
// set module instance references
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
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
// respond with the config.Service document
exports.router.get('/service', (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    res.status(200).json(config.Service);
});
exports.router.get('/count', (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    sRt.countDocs(config.MONGO_COL_SCORES, req, res);
});
// respond with the requested documents
exports.router.get('/get', (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    sRt.getDocs(config.MONGO_COL_SCORES, req, res);
});
// forward standard insert request to sharedRoutes module
exports.router.put('/insert', (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    sRt.insertDoc(config.MONGO_COL_SCORES, req, res);
});
// forward standard update request to sharedRoutes module
exports.router.put('/update', (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    sRt.updateDoc(config.MONGO_COL_SCORES, req, res);
});
// forward standard delete request to sharedRoutes module
exports.router.delete('/delete/:scoreId', (req, res) => {
    const docId = req.params.scoreId;
    sRt.deleteDoc(config.MONGO_COL_SCORES, docId, req, res);
});
// capture all unhandled routes
exports.router.get('/*', sRt.unhandledRoute);
exports.router.put('/*', sRt.unhandledRoute);
exports.router.delete('/*', sRt.unhandledRoute);
exports.router.post('/*', sRt.unhandledRoute);
// expose router as module
exports.default = exports.router;
//# sourceMappingURL=scoreRouter.js.map