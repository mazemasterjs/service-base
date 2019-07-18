import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import Logger, { LOG_LEVELS } from '@mazemasterjs/logger';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { Team } from '@mazemasterjs/shared-library/Team';
import { User } from '@mazemasterjs/shared-library/User';
import Config from './Config';
import DatabaseManager from '@mazemasterjs/database-manager/DatabaseManager';
import { DeleteWriteOpResultObject, InsertOneWriteOpResult, UpdateWriteOpResult } from 'mongodb';

// global object instances
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
 * @param colName
 * @param docId
 * @param version - number, optional - the version number of a bot code document
 */
export async function deleteDoc(colName: string, docId: any, version?: number): Promise<DeleteWriteOpResultObject> {
  const method = `deleteDoc(${colName}, ${docId}, ${version})`;
  logDebug(__filename, method, 'Attempting to delete document.');
  let query;

  // special handling is required for bot_code entries
  query = colName === config.MONGO_COL_BOTCODE ? { botId: docId, version } : { id: docId };

  return await dbMan
    .deleteDocument(colName, query)
    .then(result => {
      logDebug(__filename, method, `${result.deletedCount} documents(s) deleted from ${colName}.`);
      return Promise.resolve(result);
    })
    .catch(err => {
      log.error(__filename, method, `Error deleting document from ${colName} ->`, err);
      return Promise.reject(err);
    });
}

/**
 * Inserts the document passed via jsonDoc body into the mongo database.
 *
 * @param colName
 * @param docBody
 * @param req
 */
export async function insertDoc(colName: string, docBody: any): Promise<InsertOneWriteOpResult> {
  const method = `insertDoc(${colName}, docBody)`;
  logDebug(__filename, `insertDoc(${colName}, jsonDoc, req)`, 'Inserting document.');
  let doc: any;

  // first attempt to convert the document to an object using new <T>(data)
  try {
    doc = coerce(colName, docBody);

    // update score datetime before insert
    if (colName === config.MONGO_COL_SCORES || colName === config.MONGO_COL_BOTCODE) {
      doc.lastUpdated = Date.now();
    }
  } catch (err) {
    return Promise.reject({ error: 'Invalid Data', message: err.message });
  }

  // then attempt to inser the document into the database
  return await dbMan
    .insertDocument(colName, doc)
    .then(result => {
      logDebug(__filename, method, `${result.insertedCount} document(s) inserted.`);
      return Promise.resolve(result);
    })
    .catch(err => {
      log.error(__filename, method, 'Error inserting document ->', err);
      return Promise.reject(err);
    });
}

/**
 * Udpates the document passed via the JSON http body in the mongo database.
 *
 * @param docBody
 * @param res
 */
export async function updateDoc(colName: string, docBody: any): Promise<UpdateWriteOpResult> {
  const method = `updateDoc(${colName}, ${docBody})`;
  logDebug(__filename, method, 'Updating document.');
  let query: any;
  let doc: any;

  // special handling is required for bot_code entries
  query = colName === config.MONGO_COL_BOTCODE ? { botId: docBody.botId, version: docBody.version } : { id: docBody.id };

  // first attempt to convert the document to an object using new <T>(data)
  try {
    doc = coerce(colName, docBody);

    // update score and botcode lastUpdated timestamp before update
    if (colName === config.MONGO_COL_SCORES || colName === config.MONGO_COL_BOTCODE) {
      doc.lastUpdated = Date.now();
    }
  } catch (err) {
    return Promise.reject({ error: 'Invalid Data', message: err.message });
  }

  // then attempt to inser the document into the database
  return await dbMan
    .updateDocument(colName, query, doc)
    .then(result => {
      return Promise.resolve(result);
    })
    .catch(err => {
      log.error(__filename, method, 'Error updating document ->', err);
      return Promise.reject(err);
    });
}

/**
 * Responds with json value showing the document count in the given collection
 *
 * @param req - express.Request
 * @param res - express.Response
 */
export async function getCount(colName: string, req?: Request): Promise<number> {
  const method = `getCount(${colName})`;
  logDebug(__filename, method, 'Counting documents...');
  let query: any = {};

  // build the json object containing parameters to search for
  if (req !== undefined) {
    query = buildQueryJson(req.query);
  }

  return await dbMan
    .getDocumentCount(colName, query)
    .then(count => {
      logDebug(__filename, method, 'Count=' + count);
      return Promise.resolve(count);
    })
    .catch(err => {
      log.error(__filename, method, 'Database Error ->', err);
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
export async function getTopScoresByMaze(mazeId: string, teamIds: Array<string>, teamGames: boolean, req: Request): Promise<Array<any>> {
  const colName = config.MONGO_COL_SCORES;
  const method = `getTopScoresByMaze(${colName}, req)`;

  logDebug(__filename, method, 'Getting requested documents from database.');

  // set some vars for page handling
  const pageSize = 3;
  const pageNum = 1;
  const projection = {};
  const sort = { totalScore: -1, lastUpdated: -1 };
  let query = {};

  const gameMode = teamGames ? 2 : 1;

  if (teamIds === undefined) {
    query = { mazeId, gameMode };
  } else {
    query = { mazeId, teamId: { $in: teamIds }, gameMode };
  }

  try {
    // run the query
    logDebug(__filename, method, `QUERY :: Page ${1}, ${colName}, ${JSON.stringify(query)}`);

    let dupes = true;
    let docs = []; // await dbMan.getDocuments(colName, query, sort, projection, pageSize, pageNum);

    while (dupes) {
      docs = await dbMan.getDocuments(colName, query, sort, projection, pageSize, pageNum);
      if (docs.length > 1) {
        if (docs[0].botId === docs[1].botId && docs[0].totalScore === docs[1].totalScore) {
          await dbMan.deleteDocument(config.MONGO_COL_SCORES, { id: docs[1].id });
        } else if (docs.length > 2 && docs[1].botId === docs[2].botId && docs[1].totalScore === docs[2].totalScore) {
          await dbMan.deleteDocument(config.MONGO_COL_SCORES, { id: docs[2].id });
        } else {
          dupes = false;
        }
      } else {
        dupes = false;
      }
    }

    // return the results
    logDebug(__filename, method, `Returning ${docs.length} documents from the '${colName}' collection.`);
    return Promise.resolve(docs);
  } catch (err) {
    // log the error and return message
    log.error(__filename, method, `Error while collecting documents ->`, err);
    return Promise.reject(err);
  }
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
  logDebug(__filename, method, 'Getting requested documents from database.');

  // set some vars for page handling
  const pageSize = 10;
  const docs = new Array<any>();
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
      const page = await dbMan.getDocuments(colName, query, sort, projection, pageSize, pageNum);

      if (page.length > 0) {
        logDebug(__filename, method, `Page #${pageNum}: Processing ${page.length} document(s).`);

        // can't easily use Array.concat, so have to loop and push
        for (const doc of page) {
          try {
            const tmpDoc = stubbed ? coerce(colName, doc, true) : coerce(colName, doc);
            docs.push(tmpDoc);
          } catch (err) {
            log.warn(__filename, method, `Invalid ${colName} document encountered (_id=${doc._id}). It has been excluded from the result set.`);
          }
        }
      }

      // if we don't have at least pageSize elements, we've hit the last page
      if (page.length < pageSize) {
        done = true;
        logDebug(__filename, method, `-> Finished. ${docs.length} documents documents collected from ${pageNum} pages.`);
      } else {
        pageNum++;
      }
    }

    // return the results
    logDebug(__filename, method, `Returning ${docs.length} documents from the '${colName}' collection.`);
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
function coerce(colName: string, jsonDoc: any, isStub?: boolean): any {
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
        className = Maze.name;
        logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
        return new Maze(jsonDoc);
      }
      case config.MONGO_COL_SCORES: {
        className = Score.name;
        logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
        return Score.fromJson(jsonDoc);
      }
      case config.MONGO_COL_TROPHIES: {
        className = Trophy.name;
        logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
        return new Trophy(jsonDoc);
      }
      case config.MONGO_COL_TEAMS: {
        className = Team.name;
        logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
        return new Team(jsonDoc);
      }
      case config.MONGO_COL_USERS: {
        className = User.name;
        logTrace(__filename, method, `Attempting type coercion: JSON -> ${className}`);
        return User.fromJson(jsonDoc);
      }
      default: {
        logTrace(__filename, method, `No coercion mapped for ${colName}, returning unaltered JSON.`);
        return jsonDoc;
      }
    }
  } catch (error) {
    const err: Error = new Error(`Unable to coerce JSON into ${className} -> ${error.message}`);
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
export const generateDocs = async (colName: string, dataFile: string) => {
  const method = `generateDocs(${colName}, ${dataFile})`;
  const counts = { collection: colName, deleted: 0, inserted: 0, errors: 0 };
  logDebug(__filename, method, `Attempting to regenerate default ${config.Service.Name} documents from ${dataFile}...`);

  // make sure the file exists...
  dataFile = path.resolve(dataFile);
  if (!fs.existsSync(dataFile)) {
    const error = new Error('File Not Found: ' + dataFile);
    log.error(__filename, method, 'File Error -> ', error);
    return Promise.reject(error);
  }

  // and walk through the file's contents
  const data = JSON.parse(fs.readFileSync(dataFile, 'UTF-8'));
  let typedObj: any;

  for (const ele of data.elements) {
    // catch type/parsing errors and abort!
    try {
      // mazes have to be generated
      if (colName === config.MONGO_COL_MAZES) {
        typedObj = new Maze().generate(ele.height, ele.width, ele.challenge, ele.name, ele.seed);
      } else {
        typedObj = coerce(colName, ele);
      }
    } catch (err) {
      const error = new Error(`Unable to coerce JSON into specific type for service: ${config.Service.Name}`);
      log.error(__filename, method, 'Type Error', error);
      return Promise.reject(error);
    }

    // first try to delete the existing document (it may not exist, but that's ok)
    // Note: abusing data type consistency - all mmjs objects have an "Id:string" field
    await deleteDoc(colName, typedObj.Id)
      .then(result => {
        if (result.deletedCount && result.deletedCount > 0) {
          logDebug(__filename, method, `${result.deletedCount} ${config.Service.Name} document(s) with id=${typedObj.Id} deleted`);
          counts.deleted++;
        } else {
          logDebug(__filename, method, `${colName} document with id=${typedObj.Id} could not be deleted (may not exist).`);
        }
      })
      .catch((err: any) => {
        counts.errors++;
        log.error(__filename, method, `Error deleting ${config.Service.Name} document: id=${typedObj.Id}`, err);
      });

    // then insert the typed object
    await insertDoc(colName, typedObj)
      .then(result => {
        if (result.insertedCount > 0) {
          counts.inserted++;
          logDebug(__filename, method, `${config.Service.Name} (id=${typedObj.Id}) inserted.`);
        } else {
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
};

/**
 * Returns a JSON object to use for a mongo query prjection
 *
 * @param colName - The collection name to project for
 * @param query - A JSON object query string with or without a 'stub' key
 */
function getProjection(colName: string, query: any): any {
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
  } else if (colName === config.MONGO_COL_MAZES) {
    // Getting ALL mazes without the ?stub=true flag is a very expensive operation so we are
    // going to force the use of MAZE_STUB_PROJECTION here to protect performance
    log.warn(
      __filename,
      `getProjection(${colName}, ${JSON.stringify(query)})`,
      'Request to load ALL maze data without stub flag - enforcing use of MAZE_STUB_PROJECTION!',
    );
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
function buildQueryJson(reqQuery: any) {
  const query: any = {};
  for (const key in reqQuery) {
    if (reqQuery.hasOwnProperty(key)) {
      // check for and preserve numeric parameters
      if (isNaN(reqQuery[key])) {
        if (key === 'userName') {
          query[key] = new RegExp('^' + reqQuery[key] + '$', 'i');
        } else {
          query[key] = reqQuery[key];
        }
      } else {
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
function getSortByColName(colName: string): any {
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

function logDebug(file: string, method: string, message: string) {
  if (log.LogLevel >= LOG_LEVELS.DEBUG) {
    log.debug(file, method, message);
  }
}

function logTrace(file: string, method: string, message: string) {
  if (log.LogLevel >= LOG_LEVELS.DEBUG) {
    log.trace(file, method, message);
  }
}
