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
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
const Score_1 = require("@mazemasterjs/shared-library/Score");
const Trophy_1 = require("@mazemasterjs/shared-library/Trophy");
const Config_1 = __importDefault(require("../Config"));
const DatabaseManager_1 = __importDefault(require("@mazemasterjs/database-manager/DatabaseManager"));
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
 * @param req - express.Request
 * @param res - express.Response
 */
function deleteDoc(colName, docId, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `deleteDoc(${colName}, ${docId}, req)`;
        log.debug(__filename, method, 'Attempting to delete document.');
        return yield dbMan
            .deleteDocument(colName, { id: docId })
            .then(result => {
            log.debug(__filename, req.url, `${result.deletedCount} documents(s) deleted from ${colName}.`);
            return Promise.resolve(result);
        })
            .catch(err => {
            log.error(__filename, req.url, `Error deleting document from ${colName} ->`, err);
            return Promise.reject(err);
        });
    });
}
exports.deleteDoc = deleteDoc;
/**
 * Inserts the document passed via JSON http body into the mongo database.
 *
 * @param req
 * @param res
 */
function insertDoc(colName, req) {
    return __awaiter(this, void 0, void 0, function* () {
        log.debug(__filename, `insertDoc(${colName}, req)`, 'Inserting document.');
        let doc;
        // first attempt to convert the document to an object using new <T>(data)
        try {
            doc = coerceJson(colName, req.body);
        }
        catch (err) {
            return Promise.reject({ error: 'Invalid Data', message: err.message });
        }
        // then attempt to inser the document into the database
        return yield dbMan
            .insertDocument(colName, doc)
            .then(result => {
            return Promise.resolve(result);
        })
            .catch(err => {
            log.error(__filename, req.url, 'Error inserting document ->', err);
            return Promise.reject(err);
        });
    });
}
exports.insertDoc = insertDoc;
/**
 * Udpates the document passed via the JSON http body in the mongo database.
 *
 * @param req
 * @param res
 */
function updateDoc(colName, req) {
    return __awaiter(this, void 0, void 0, function* () {
        log.debug(__filename, `insertDoc(${colName}, req)`, 'Inserting document.');
        let doc = req.body;
        const docId = doc.id;
        // first attempt to convert the document to an object using new <T>(data)
        try {
            doc = coerceJson(colName, req.body);
        }
        catch (err) {
            return Promise.reject({ error: 'Invalid Data', message: err.message });
        }
        // then attempt to inser the document into the database
        return yield dbMan
            .updateDocument(colName, { id: docId }, doc)
            .then(result => {
            return Promise.resolve(result);
        })
            .catch(err => {
            log.error(__filename, req.url, 'Error updating document ->', err);
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
        log.debug(__filename, req.url, 'Handling request -> ' + req.path);
        const query = {};
        // build the json object containing score parameters to search for
        for (const key in req.query) {
            if (req.query.hasOwnProperty(key)) {
                query[key] = req.query[key];
            }
        }
        return yield dbMan
            .getDocumentCount(colName, query)
            .then(count => {
            log.debug(__filename, `getCount(${colName}, ${query}, req)`, 'Count=' + count);
            return Promise.resolve(count);
        })
            .catch(err => {
            log.error(__filename, `getCount(${colName}, req)`, 'Database Error ->', err);
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
        log.debug(__filename, method, 'Getting requested documents from database.');
        const pageSize = 10;
        let pageNum = 1;
        const query = {};
        const docs = new Array();
        let done = false;
        // build the json object containing score parameters to search for
        for (const key in req.query) {
            if (req.query.hasOwnProperty(key)) {
                query[key] = req.query[key];
            }
        }
        try {
            // loop through the paged list of docs and build a return array.
            while (!done) {
                log.debug(__filename, method, `QUERY :: Page ${pageNum}, ${colName}, ${JSON.stringify(query)}`);
                const page = yield dbMan.getDocuments(colName, query, {}, pageSize, pageNum);
                if (page.length > 0) {
                    log.debug(__filename, method, `Page #${pageNum}: Processing ${page.length} document(s).`);
                    // can't easily use Array.concat, so have to loop and push
                    for (const doc of page) {
                        try {
                            const tmpDoc = coerceJson(colName, doc);
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
                    log.debug(__filename, method, `-> Finished. ${docs.length} documents documents collected from ${pageNum} pages.`);
                }
                else {
                    pageNum++;
                }
            }
            // return the results
            log.debug(__filename, method, `Returning ${docs.length} documents from the '${colName}' collection.`);
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
function coerceJson(colName, jsonDoc) {
    let className = '';
    const method = `jsonToClass(${colName}, jsonDoc)`;
    try {
        switch (colName) {
            case config.MONGO_COL_SCORES: {
                className = Score_1.Score.name;
                log.debug(__filename, method, `Attempting type coercion: JSON -> ${className}`);
                return new Score_1.Score(jsonDoc);
            }
            case config.MONGO_COL_TROPHIES: {
                log.debug(__filename, method, `Attempting type coercion: JSON -> ${className}`);
                className = Trophy_1.Trophy.name;
                return new Trophy_1.Trophy(jsonDoc);
            }
            default: {
                log.debug(__filename, method, `No coercion mapped for ${colName}, returning unaltered JSON.`);
                return jsonDoc;
            }
        }
    }
    catch (error) {
        const err = new Error(`Unable to coerce JSON into ${className} -> ${error.message}`);
        log.error(__filename, `jsonToClass(${colName}, req)`, `Data Error ->`, err);
        throw err;
    }
}
//# sourceMappingURL=sharedFuncs.js.map