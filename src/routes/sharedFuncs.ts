import { Maze } from '@mazemasterjs/shared-library/Maze';
import fs, { promises } from 'fs';
import { Request } from 'express';
import Logger from '@mazemasterjs/logger';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import path from 'path';
import { Team } from '@mazemasterjs/shared-library/Team';
import Config from '../Config';
import DatabaseManager from '@mazemasterjs/database-manager/DatabaseManager';
import { resolve } from 'dns';
import { DeleteWriteOpResultObject, InsertOneWriteOpResult, UpdateWriteOpResult } from 'mongodb';

const log = Logger.getInstance();
const config = Config.getInstance();

// declare dbMan - initialized during startup
let dbMan: DatabaseManager;

/**
 * This just assigns mongo the instance of DatabaseManager.  We shouldn't be
 * able to get here without a database connection and existing instance, but
 * we'll do some logging / error checking anyway.
 */
DatabaseManager.getInstance()
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
export async function deleteDoc(colName: string, docId: any, req: Request): Promise<DeleteWriteOpResultObject> {
  const method = `deleteDoc(${colName}, ${docId}, req)`;
  log.debug(__filename, method, 'Attempting to delete document.');

  return await dbMan
    .deleteDocument(colName, { id: docId })
    .then(result => {
      log.debug(__filename, req.url, `${result.deletedCount} documents(s) deleted from ${colName}.`);
      return Promise.resolve(result);
    })
    .catch(err => {
      log.error(__filename, req.url, `Error deleting document from ${colName} ->`, err);
      return Promise.reject(err);
    });
}

/**
 * Inserts the document passed via JSON http body into the mongo database.
 *
 * @param req
 * @param res
 */
export async function insertDoc(colName: string, req: Request): Promise<InsertOneWriteOpResult> {
  log.debug(__filename, `insertDoc(${colName}, req)`, 'Inserting document.');
  let doc: any;

  // first attempt to convert the document to an object using new <T>(data)
  try {
    doc = coerce(colName, req.body);
  } catch (err) {
    return Promise.reject({ error: 'Invalid Data', message: err.message });
  }

  // then attempt to inser the document into the database
  return await dbMan
    .insertDocument(colName, doc)
    .then(result => {
      return Promise.resolve(result);
    })
    .catch(err => {
      log.error(__filename, req.url, 'Error inserting document ->', err);
      return Promise.reject(err);
    });
}

/**
 * Udpates the document passed via the JSON http body in the mongo database.
 *
 * @param req
 * @param res
 */
export async function updateDoc(colName: string, req: Request): Promise<UpdateWriteOpResult> {
  log.debug(__filename, `insertDoc(${colName}, req)`, 'Inserting document.');
  let doc: any = req.body;
  const docId: any = doc.id;

  // first attempt to convert the document to an object using new <T>(data)
  try {
    doc = coerce(colName, req.body);
  } catch (err) {
    return Promise.reject({ error: 'Invalid Data', message: err.message });
  }

  // then attempt to inser the document into the database
  return await dbMan
    .updateDocument(colName, { id: docId }, doc)
    .then(result => {
      return Promise.resolve(result);
    })
    .catch(err => {
      log.error(__filename, req.url, 'Error updating document ->', err);
      return Promise.reject(err);
    });
}

/**
 * Responds with json value showing the document count in the given collection
 *
 * @param req - express.Request
 * @param res - express.Response
 */
export async function getCount(colName: string, req: Request): Promise<number> {
  log.debug(__filename, req.url, 'Handling request -> ' + req.path);
  const query: any = {};

  // build the json object containing score parameters to search for
  for (const key in req.query) {
    if (req.query.hasOwnProperty(key)) {
      query[key] = req.query[key];
    }
  }

  return await dbMan
    .getDocumentCount(colName, query)
    .then(count => {
      log.debug(__filename, `getCount(${colName}, ${query}, req)`, 'Count=' + count);
      return Promise.resolve(count);
    })
    .catch(err => {
      log.error(__filename, `getCount(${colName}, req)`, 'Database Error ->', err);
      return Promise.reject(err);
    });
}

/**
 * Returns all documents from the given collection that match the query parameters. If no
 * query parameters are given, all documents will be returned (be careful!)
 *
 * @param colName - collection to query
 * @param req - express request
 * @param res - express response
 */
export async function getDocs(colName: string, req: Request): Promise<Array<any>> {
  const method = `getDocs(${colName}, req)`;
  log.debug(__filename, method, 'Getting requested documents from database.');

  const pageSize = 10;
  let pageNum = 1;
  const query: any = {};
  const docs = new Array<any>();
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
      const page = await dbMan.getDocuments(colName, query, {}, pageSize, pageNum);

      if (page.length > 0) {
        log.debug(__filename, method, `Page #${pageNum}: Processing ${page.length} document(s).`);

        // can't easily use Array.concat, so have to loop and push
        for (const doc of page) {
          try {
            const tmpDoc = coerce(colName, doc);
            docs.push(tmpDoc);
          } catch (err) {
            log.warn(__filename, method, `Invalid ${colName} document encountered (_id=${doc._id}). It has been excluded from the result set.`);
          }
        }
      }

      // if we don't have at least pageSize elements, we've hit the last page
      if (page.length < pageSize) {
        done = true;
        log.debug(__filename, method, `-> Finished. ${docs.length} documents documents collected from ${pageNum} pages.`);
      } else {
        pageNum++;
      }
    }

    // return the results
    log.debug(__filename, method, `Returning ${docs.length} documents from the '${colName}' collection.`);
    return Promise.resolve(docs);
  } catch (err) {
    // log the error and return message
    log.error(__filename, method, `Error while collecting documents ->`, err);
    return Promise.reject(err);
  }
}

/**
 * Attempt to load the given json via a stuctured class
 *
 * @param colName
 * @param jsonDoc
 * @param typeName
 */
function coerce(colName: string, jsonDoc: any): any {
  let className = '';
  const method = `coerce(${colName}, jsonDoc)`;

  try {
    switch (colName) {
      case config.MONGO_COL_SCORES: {
        className = Score.name;
        log.debug(__filename, method, `Attempting type coercion: JSON -> ${className}`);
        return new Score(jsonDoc);
      }
      case config.MONGO_COL_TROPHIES: {
        className = Trophy.name;
        log.debug(__filename, method, `Attempting type coercion: JSON -> ${className}`);
        return new Trophy(jsonDoc);
      }
      default: {
        log.debug(__filename, method, `No coercion mapped for ${colName}, returning unaltered JSON.`);
        return jsonDoc;
      }
    }
  } catch (error) {
    const err: Error = new Error(`Unable to coerce JSON into ${className} -> ${error.message}`);
    log.error(__filename, `coerce(${colName}, req)`, `Data Error ->`, err);
    throw err;
  }
}
