"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const sFn = __importStar(require("./sharedFuncs"));
const sRt = __importStar(require("./sharedRoutes"));
const fs_1 = __importDefault(require("fs"));
const Config_1 = __importDefault(require("../Config"));
const express_1 = __importDefault(require("express"));
const Trophy_1 = require("@mazemasterjs/shared-library/Trophy");
const logger_1 = require("@mazemasterjs/logger");
exports.router = express_1.default.Router();
// set module instance references
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
/**
 * Regenerates (delete/insert) the default trophy list
 *
 * @param req
 * @param res
 */
const genTrophies = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.debug(__filename, 'genTrophies(req, res)', 'Attempting to regenerate default trophies...');
    // make sure the file exists...
    if (!fs_1.default.existsSync(config.DATA_FILE_TROPHIES)) {
        log.warn(__filename, 'genTrophies(req, res)', 'Cannot continue, file not found: ' + config.DATA_FILE_TROPHIES);
        return res.status(500).json({ error: 'File Not Found', message: 'Cannot continue, file not found: ' + config.DATA_FILE_TROPHIES });
    }
    // and walk through the file's contents
    const data = JSON.parse(fs_1.default.readFileSync(config.DATA_FILE_TROPHIES, 'UTF-8'));
    for (const tData of data.trophies) {
        let trophy;
        // catch type/parsing errors and abort!
        try {
            tData.lastUpdated = Date.now();
            trophy = new Trophy_1.Trophy(tData);
        }
        catch (err) {
            log.warn(__filename, 'genTrophies(req, res)', `Unable to parse trophy data: ${JSON.stringify(tData)}`);
            return res.status(500).json({ error: 'Data Error', message: 'Invalid trophy data encountered in ' + config.DATA_FILE_TROPHIES });
        }
        // first try to delete the trophy (it may not exist, but that's ok)
        yield sFn
            .deleteDoc(config.MONGO_COL_TROPHIES, trophy.Id, req)
            .then(result => {
            if (result.deletedCount && result.deletedCount > 0) {
                log.debug(__filename, 'genTrophies(req, res)', `${result.deletedCount} trophy document(s) with id=${trophy.Id} deleted`);
            }
            else {
                log.debug(__filename, 'genTrophies(req, res)', `Trophy (id=${trophy.Id}) could not be deleted (may not exist).`);
            }
        })
            .catch((err) => {
            log.warn(__filename, 'genTrophies(req, res)', `Error deleting trophy (id=${trophy.Id}) -> ${err.message}`);
        });
        // then insert the trophy from our json file
        yield sFn
            .insertDoc(config.MONGO_COL_TROPHIES, trophy, req)
            .then(result => {
            if (result.insertedCount > 0) {
                log.debug(__filename, 'genTrophies(req, res)', `Trophy (id=${trophy.Id}) inserted.`);
            }
            else {
                log.warn(__filename, 'genTrophies(req, res)', `insertedCount is 0. Trophy (id=${trophy.Id}) was NOT inserted.`);
            }
        })
            .catch(err => {
            log.warn(__filename, 'genTrophies(req, res)', `Error inserting trophy (id=${trophy.Id}) -> ${err.message}`);
        });
    }
    yield sFn
        .getCount(config.MONGO_COL_TROPHIES, req)
        .then(count => {
        log.debug(__filename, 'genTrophies(req, res)', 'Trophy Document Count=' + count);
        res.status(200).json({ message: 'Default trophies generated.', collection: config.MONGO_COL_TROPHIES, 'trophy-count': count });
    })
        .catch(err => {
        res.status(500).json(err);
    });
});
// regenerate the default trophy documents (delete / insert)
exports.router.get('/regenerate-default-trophies', (req, res) => {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    genTrophies(req, res);
});
// map the common services
exports.router.get('/service', sRt.getServiceDoc);
exports.router.get('/count', sRt.countDocs);
exports.router.get('/get', sRt.getDocs);
exports.router.put('/insert', sRt.insertDoc);
exports.router.put('/update', sRt.updateDoc);
exports.router.delete('/delete/:docId', sRt.deleteDoc);
// map the live/ready probes
exports.router.get('/probes/live', sRt.livenessProbe);
exports.router.get('/probes/ready', sRt.readinessProbe);
// capture all unhandled routes
exports.router.get('/*', sRt.unhandledRoute);
exports.router.put('/*', sRt.unhandledRoute);
exports.router.delete('/*', sRt.unhandledRoute);
exports.router.post('/*', sRt.unhandledRoute);
// expose router as module
exports.default = exports.router;
//# sourceMappingURL=trophyRouter.js.map