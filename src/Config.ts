import Logger from '@mazemasterjs/logger';
import Service from '@mazemasterjs/shared-library/Service';
import fs from 'fs';
import path from 'path';

const log = Logger.getInstance();

export class Config {
  public SERVICE_DOC_FILE: string;
  public HTTP_PORT: number;
  public LOG_LEVEL: number;
  public MONGO_COL_MAZES: string;
  public MONGO_COL_TEAMS: string;
  public MONGO_COL_SCORES: string;
  public MONGO_COL_TROPHIES: string;
  public MONGO_CURSOR_LIMIT: number;
  public MONGO_CONNSTR: string;
  public MONGO_DB: string;

  private service: Service;

  constructor() {
    this.LOG_LEVEL = this.getVar('LOG_LEVEL', 'number');
    this.SERVICE_DOC_FILE = this.getVar('SERVICE_DOC_FILE', 'string');
    this.HTTP_PORT = this.getVar('HTTP_PORT', 'number');
    this.MONGO_COL_MAZES = this.getVar('MONGO_COL_MAZES', 'string');
    this.MONGO_COL_SCORES = this.getVar('MONGO_COL_SCORES', 'string');
    this.MONGO_COL_TEAMS = this.getVar('MONGO_COL_TEAMS', 'string');
    this.MONGO_COL_TROPHIES = this.getVar('MONGO_COL_TROPHIES', 'string');
    this.MONGO_CONNSTR = this.getVar('MONGO_CONNSTR', 'string');
    this.MONGO_DB = this.getVar('MONGO_DB', 'string');
    this.MONGO_CURSOR_LIMIT = this.getVar('MONGO_CURSOR_LIMIT', 'number');

    this.service = this.loadServiceData(this.SERVICE_DOC_FILE);
  }

  public get Service(): Service {
    return this.service;
  }

  /**
   * Loads the given service.json file, creates a Service object from the data,
   * and returns the Service.
   *
   * @param svcDocFile
   */
  private loadServiceData(svcDocFile: string): Service {
    const svc = new Service();
    const absDocPath = path.resolve(svcDocFile);

    // make sure the file exists
    if (!fs.existsSync(absDocPath)) {
      this.doError(`loadService(${svcDocFile})`, 'Service Error', `${svcDocFile} does not exist. ${this.Service.Name} cannot start.`);
    }

    // load the data into a the service object
    svc.loadFromJson(JSON.parse(fs.readFileSync(svcDocFile, 'UTF-8')));

    // and return the service
    return svc;
  }

  /**
   * Gets and returns the value of the requested environment variable
   * as the given type.
   *
   * @param varName - the name of the environment variable to get
   * @param typeName - tye name of the type to return the value as (string | number)
   */
  private getVar = (varName: string, typeName: string): any => {
    let val = process.env[varName];

    // first see if the variable was found - if not, let's blow this sucker up
    if (val === undefined) {
      this.doError(`getVar(${varName}, ${typeName})`, 'Configuration Error', `Environment variable not set: ${varName}`);
    }

    // we have a value - log the good news
    log.info(__filename, `getVar(${varName}, ${typeName})`, `${varName}=${val}`);

    // convert to expect type and return
    switch (typeName) {
      case 'string': {
        return val;
      }
      case 'number': {
        return parseInt(val + '', 10); // this could blow up, but that's ok since we'd want it to
      }
      default: {
        // we only want numbers or strings...
        this.doError(`getVar(${varName}, ${typeName})`, 'Argument Error', `Invalid variable type name: ${typeName}. Try 'string' or 'number' instead.`);
      }
    }
  };

  private doError(method: string, title: string, message: string) {
    const err = new Error(message);
    log.error(__filename, method, title + ' ->', err);
    throw err;
  }
}

export default Config;
