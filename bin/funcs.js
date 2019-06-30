"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importStar(require("@mazemasterjs/logger"));
const Score_1 = require("@mazemasterjs/shared-library/Score");
const Trophy_1 = require("@mazemasterjs/shared-library/Trophy");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const Team_1 = require("@mazemasterjs/shared-library/Team");
const User_1 = require("@mazemasterjs/shared-library/User");
const Config_1 = __importDefault(require("./Config"));
const DatabaseManager_1 = __importDefault(require("@mazemasterjs/database-manager/DatabaseManager"));
// global object instances
const log = logger_1.default.getInstance();
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
/**
 * Remove the score document with the ID found in req.id and sends result/count as json response
 *
 * @param colName
 * @param docId
 * @param version - number, optional - the version number of a bot code document
 */
function deleteDoc(colName, docId, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `deleteDoc(${colName}, ${docId}, ${version})`;
        logDebug(__filename, method, 'Attempting to delete document.');
        let query;
        // special handling is required for bot_code entries
        query = colName === config.MONGO_COL_BOTCODE ? { botId: docId, version } : { id: docId };
        return yield dbMan
            .deleteDocument(colName, query)
            .then(result => {
            logDebug(__filename, method, `${result.deletedCount} documents(s) deleted from ${colName}.`);
            return Promise.resolve(result);
        })
            .catch(err => {
            log.error(__filename, method, `Error deleting document from ${colName} ->`, err);
            return Promise.reject(err);
        });
    });
}
exports.deleteDoc = deleteDoc;
/**
 * Inserts the document passed via jsonDoc body into the mongo database.
 *
 * @param colName
 * @param docBody
 * @param req
 */
function insertDoc(colName, docBody) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `insertDoc(${colName}, docBody)`;
        logDebug(__filename, `insertDoc(${colName}, jsonDoc, req)`, 'Inserting document.');
        let doc;
        // first attempt to convert the document to an object using new <T>(data)
        try {
            doc = coerce(colName, docBody);
            // update score datetime before insert
            if (colName === config.MONGO_COL_SCORES || colName === config.MONGO_COL_BOTCODE) {
                doc.lastUpdated = Date.now();
            }
        }
        catch (err) {
            return Promise.reject({ error: 'Invalid Data', message: err.message });
        }
        // then attempt to inser the document into the database
        return yield dbMan
            .insertDocument(colName, doc)
            .then(result => {
            logDebug(__filename, method, `${result.insertedCount} document(s) inserted.`);
            return Promise.resolve(result);
        })
            .catch(err => {
            log.error(__filename, method, 'Error inserting document ->', err);
            return Promise.reject(err);
        });
    });
}
exports.insertDoc = insertDoc;
/**
 * Udpates the document passed via the JSON http body in the mongo database.
 *
 * @param docBody
 * @param res
 */
function updateDoc(colName, docBody) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `updateDoc(${colName}, ${docBody})`;
        logDebug(__filename, method, 'Updating document.');
        let query;
        let doc;
        // special handling is required for bot_code entries
        query = colName === config.MONGO_COL_BOTCODE ? { botId: docBody.botId, version: docBody.version } : { id: docBody.id };
        // first attempt to convert the document to an object using new <T>(data)
        try {
            doc = coerce(colName, docBody);
            // update score and botcode lastUpdated timestamp before update
            if (colName === config.MONGO_COL_SCORES || colName === config.MONGO_COL_BOTCODE) {
                doc.lastUpdated = Date.now();
            }
        }
        catch (err) {
            return Promise.reject({ error: 'Invalid Data', message: err.message });
        }
        // then attempt to inser the document into the database
        return yield dbMan
            .updateDocument(colName, query, doc)
            .then(result => {
            return Promise.resolve(result);
        })
            .catch(err => {
            log.error(__filename, method, 'Error updating document ->', err);
            return Promise.reject(err);
        });
    });
}
exports.updateDoc = updateDoc;
/**
 * Responds with json value showing the document count in the given collection
 *
 * @param req - express.Request
 * @param res - express.Response
 */
function getCount(colName, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `getCount(${colName})`;
        logDebug(__filename, method, 'Counting documents...');
        let query = {};
        // build the json object containing parameters to search for
        if (req !== undefined) {
            query = buildQueryJson(req.query);
        }
        return yield dbMan
            .getDocumentCount(colName, query)
            .then(count => {
            logDebug(__filename, method, 'Count=' + count);
            return Promise.resolve(count);
        })
            .catch(err => {
            log.error(__filename, method, 'Database Error ->', err);
            return Promise.reject(err);
        });
    });
}
exports.getCount = getCount;
/**
 * Returns all documents from the given collection that match the query parameters. If no
 * query parameters are given, all documents will be returned (be careful!)
 *
 * @param colName - collection to query
 * @param req - express request
 * @param res - express response
 */
function getDocs(colName, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `getDocs(${colName}, req)`;
        logDebug(__filename, method, 'Getting requested documents from database.');
        // set some vars for page handling
        const pageSize = 10;
        const docs = new Array();
        let pageNum = 1;
        let done = false;
        // build the json object containing score parameters to search for
        const sort = getSortByColName(colName);
        const query = buildQueryJson(req.query);
        // set the appropriate projections
        const projection = getProjection(colName, query);
        const stubbed = Object.entries(projection).length > 1;
        try {
            // loop through the paged list of docs and build a return array.
            while (!done) {
                logDebug(__filename, method, `QUERY :: Page ${pageNum}, ${colName}, ${JSON.stringify(query)}`);
                const page = yield dbMan.getDocuments(colName, query, sort, projection, pageSize, pageNum);
                if (page.length > 0) {
                    logDebug(__filename, method, `Page #${pageNum}: Processing ${page.length} document(s).`);
                    // can't easily use Array.concat, so have to loop and push
                    for (const doc of page) {
                        try {
                            const tmpDoc = stubbed ? coerce(colName, doc, true) : coerce(colName, doc);
                            docs.push(tmpDoc);
                        }
                        catch (err) {
                            log.warn(__filename, method, `Invalid ${colName} document encountered (_id=${doc._id}). It has been excluded from the result set.`);
                        }
                    }
                }
                // if we don't have at least pageSize elements, we've hit the last page
                if (page.length < pageSize) {
                    done = true;
                    logDebug(__filename, method, `-> Finished. ${docs.length} documents documents collected from ${pageNum} pages.`);
                }
                else {
                    pageNum++;
                }
            }
            // return the results
            logDebug(__filename, method, `Returning ${docs.length} documents from the '${colName}' collection.`);
            return Promise.resolve(docs);
        }
        catch (err) {
            // log the error and return message
            log.error(__filename, method, `Error while collecting documents ->`, err);
            return Promise.reject(err);
        }
    });
}
exports.getDocs = getDocs;
/**
 * Attempt to load the given json via a stuctured class
 *
 * @param colName
 * @param jsonDoc
 * @param typeName
 */
function coerce(colName, jsonDoc, isStub) {
    let className = '';
    const method = `coerce(${colName}, jsonDoc)`;
    // stubs can't be coerced - this will force default case
    if (isStub) {
        colName += '_stub';
    }
    // attempt to coerce data into class based on collection name
    try {
        switch (colName) {
            case config.MONGO_COL_MAZES: {
                className = Maze_1.Maze.name;
                logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
                return new Maze_1.Maze(jsonDoc);
            }
            case config.MONGO_COL_SCORES: {
                className = Score_1.Score.name;
                logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
                return Score_1.Score.fromJson(jsonDoc);
            }
            case config.MONGO_COL_TROPHIES: {
                className = Trophy_1.Trophy.name;
                logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
                return new Trophy_1.Trophy(jsonDoc);
            }
            case config.MONGO_COL_TEAMS: {
                className = Team_1.Team.name;
                logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
                return new Team_1.Team(jsonDoc);
            }
            case config.MONGO_COL_USERS: {
                className = User_1.User.name;
                logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
                return User_1.User.fromJson(jsonDoc);
            }
            default: {
                logTrace(__filename, method, `No coercion mapped for ${colName}, returning unaltered JSON.`);
                return jsonDoc;
            }
        }
    }
    catch (error) {
        const err = new Error(`Unable to coerce JSON into ${className} -> ${error.message}`);
        log.error(__filename, `coerce(${colName}, req)`, `Data Error ->`, err);
        throw err;
    }
}
/**
 * Regenerates (delete then insert) data from the given json data file
 *
 * @param colName string - The collection to regenerate default documents in
 * @param dataFile string - The json data file to use as a data source
 */
exports.generateDocs = (colName, dataFile) => __awaiter(this, void 0, void 0, function* () {
    const method = `generateDocs(${colName}, ${dataFile})`;
    const counts = { collection: colName, deleted: 0, inserted: 0, errors: 0 };
    logDebug(__filename, method, `Attempting to regenerate default ${config.Service.Name} documents from ${dataFile}...`);
    // make sure the file exists...
    dataFile = path_1.default.resolve(dataFile);
    if (!fs_1.default.existsSync(dataFile)) {
        const error = new Error('File Not Found: ' + dataFile);
        log.error(__filename, method, 'File Error -> ', error);
        return Promise.reject(error);
    }
    // and walk through the file's contents
    const data = JSON.parse(fs_1.default.readFileSync(dataFile, 'UTF-8'));
    let typedObj;
    for (const ele of data.elements) {
        // catch type/parsing errors and abort!
        try {
            // mazes have to be generated
            if (colName === config.MONGO_COL_MAZES) {
                typedObj = new Maze_1.Maze().generate(ele.height, ele.width, ele.challenge, ele.name, ele.seed);
            }
            else {
                typedObj = coerce(colName, ele);
            }
        }
        catch (err) {
            const error = new Error(`Unable to coerce JSON into specific type for service: ${config.Service.Name}`);
            log.error(__filename, method, 'Type Error', error);
            return Promise.reject(error);
        }
        // first try to delete the existing document (it may not exist, but that's ok)
        // Note: abusing data type consistency - all mmjs objects have an "Id:string" field
        yield deleteDoc(colName, typedObj.Id)
            .then(result => {
            if (result.deletedCount && result.deletedCount > 0) {
                logDebug(__filename, method, `${result.deletedCount} ${config.Service.Name} document(s) with id=${typedObj.Id} deleted`);
                counts.deleted++;
            }
            else {
                logDebug(__filename, method, `${colName} document with id=${typedObj.Id} could not be deleted (may not exist).`);
            }
        })
            .catch((err) => {
            counts.errors++;
            log.error(__filename, method, `Error deleting ${config.Service.Name} document: id=${typedObj.Id}`, err);
        });
        // then insert the typed object
        yield insertDoc(colName, typedObj)
            .then(result => {
            if (result.insertedCount > 0) {
                counts.inserted++;
                logDebug(__filename, method, `${config.Service.Name} (id=${typedObj.Id}) inserted.`);
            }
            else {
                log.warn(__filename, method, `insertedCount is 0. ${config.Service.Name} (id=${typedObj.Id}) was NOT inserted.`);
            }
        })
            .catch(err => {
            counts.errors++;
            log.error(__filename, method, `Error inserting ${config.Service.Name} (id=${typedObj.Id})`, err);
        });
    }
    logDebug(__filename, method, 'Results:' + JSON.stringify(counts));
    return Promise.resolve(counts);
});
/**
 * Returns a JSON object to use for a mongo query prjection
 *
 * @param colName - The collection name to project for
 * @param query - A JSON object query string with or without a 'stub' key
 */
function getProjection(colName, query) {
    const stubKey = 'stub';
    logDebug(__filename, `getProjection(${colName}, ${JSON.stringify(query)})`, 'Getting projection.');
    if (Object.entries(query).length > 0) {
        if (query[stubKey] === 'true') {
            delete query[stubKey];
            switch (colName) {
                case config.MONGO_COL_MAZES: {
                    logDebug(__filename, `getProjection(${colName}, ${JSON.stringify(query)})`, 'Stub flag found, returning MAZE_STUB_PROJECTION');
                    return config.MAZE_STUB_PROJECTION;
                }
                case config.MONGO_COL_TEAMS: {
                    logDebug(__filename, `getProjection(${colName}, ${JSON.stringify(query)})`, 'Stub flag found, returning TEAM_STUB_PROJECTION');
                    return config.TEAM_STUB_PROJECTION;
                }
            }
        }
    }
    else if (colName === config.MONGO_COL_MAZES) {
        // Getting ALL mazes without the ?stub=true flag is a very expensive operation so we are
        // going to force the use of MAZE_STUB_PROJECTION here to protect performance
        log.warn(__filename, `getProjection(${colName}, ${JSON.stringify(query)})`, 'Request to load ALL maze data without stub flag - enforcing use of MAZE_STUB_PROJECTION!');
        return config.MAZE_STUB_PROJECTION;
    }
    return {};
}
/**
 * Returns a JSON object represntation of the given request query string
 *
 * @param reqQuery - request querystring
 * @returns any - JSON object
 */
function buildQueryJson(reqQuery) {
    const query = {};
    for (const key in reqQuery) {
        if (reqQuery.hasOwnProperty(key)) {
            // check for and preserve numeric parameters
            if (isNaN(reqQuery[key])) {
                query[key] = reqQuery[key];
            }
            else {
                query[key] = parseInt(reqQuery[key], 10);
            }
        }
    }
    return query;
}
/**
 * Returns the default sort object for the given collection
 * @param colName
 */
function getSortByColName(colName) {
    switch (colName) {
        case config.MONGO_COL_MAZES: {
            return config.MAZE_SORT;
        }
        case config.MONGO_COL_SCORES: {
            return config.SCORE_SORT;
        }
        case config.MONGO_COL_TROPHIES: {
            return config.TROPHY_SORT;
        }
        case config.MONGO_COL_TEAMS: {
            return config.TEAM_SORT;
        }
        default: {
            return {};
        }
    }
}
function logDebug(file, method, message) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.DEBUG) {
        log.debug(file, method, message);
    }
}
function logTrace(file, method, message) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.DEBUG) {
        log.trace(file, method, message);
    }
}
//# sourceMappingURL=funcs.js.map