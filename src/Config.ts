import Logger from '@mazemasterjs/logger';
import Service from '@mazemasterjs/shared-library/Service';
import fs from 'fs';
import path from 'path';

const log = Logger.getInstance();

export class Config {
  /**
   * Instantiate and/or returns class instance
   */
  public static getInstance(): Config {
    if (this.instance === undefined) {
      this.instance = new Config();
    }

    return this.instance;
  }

  // singleton instance reference
  private static instance: Config;

  // public member vars
  public HTTP_PORT: number;
  public readonly SERVICE_DOC_FILE: string;
  public readonly LOG_LEVEL: number;
  public readonly MONGO_COL_MAZES: string;
  public readonly MONGO_COL_TEAMS: string;
  public readonly MONGO_COL_SCORES: string;
  public readonly MONGO_COL_TROPHIES: string;
  public readonly MONGO_CONNSTR: string;
  public readonly MONGO_DB: string;
  public readonly CURSOR_LIMIT_MAZES: number;
  public readonly CURSOR_LIMIT_SCORES: number;
  public readonly CURSOR_LIMIT_TEAMS: number;
  public readonly CURSOR_LIMIT_TROPHIES: number;
  public readonly DATA_FILE_TROPHIES: string;
  public readonly DATA_FILE_MAZES: string;
  public readonly MAZE_STUB_PROJECTION: any;
  public readonly TEAM_STUB_PROJECTION: any;
  public readonly MAZE_SORT: any;
  public readonly SCORE_SORT: any;
  public readonly TEAM_SORT: any;
  public readonly TROPHY_SORT: any;

  // private member vars
  private service: Service;

  // singleton pattern - constructor is private, use static Config.getInstance()
  private constructor() {
    this.LOG_LEVEL = this.getVar('LOG_LEVEL', 'number');
    this.SERVICE_DOC_FILE = this.getVar('SERVICE_DOC_FILE', 'string');
    this.HTTP_PORT = this.getVar('HTTP_PORT', 'number');
    this.MONGO_COL_MAZES = this.getVar('MONGO_COL_MAZES', 'string');
    this.MONGO_COL_SCORES = this.getVar('MONGO_COL_SCORES', 'string');
    this.MONGO_COL_TEAMS = this.getVar('MONGO_COL_TEAMS', 'string');
    this.MONGO_COL_TROPHIES = this.getVar('MONGO_COL_TROPHIES', 'string');
    this.MONGO_CONNSTR = this.getVar('MONGO_CONNSTR', 'string');
    this.MONGO_DB = this.getVar('MONGO_DB', 'string');
    this.CURSOR_LIMIT_MAZES = this.getVar('CURSOR_LIMIT_MAZES', 'number');
    this.CURSOR_LIMIT_SCORES = this.getVar('CURSOR_LIMIT_SCORES', 'number');
    this.CURSOR_LIMIT_TEAMS = this.getVar('CURSOR_LIMIT_TEAMS', 'number');
    this.CURSOR_LIMIT_TROPHIES = this.getVar('CURSOR_LIMIT_TROPHIES', 'number');
    this.DATA_FILE_TROPHIES = this.getVar('DATA_FILE_TROPHIES', 'string');
    this.DATA_FILE_MAZES = this.getVar('DATA_FILE_MAZES', 'string');
    this.MAZE_STUB_PROJECTION = this.getVar('MAZE_STUB_PROJECTION', 'json-string');
    this.TEAM_STUB_PROJECTION = this.getVar('TEAM_STUB_PROJECTION', 'json-string');
    this.MAZE_SORT = this.getVar('MAZE_SORT', 'json-string');
    this.SCORE_SORT = this.getVar('SCORE_SORT', 'json-string');
    this.TEAM_SORT = this.getVar('TEAM_SORT', 'json-string');
    this.TROPHY_SORT = this.getVar('TROPHY_SORT', 'json-string');

    // service-specific initialization
    this.service = this.loadServiceData(this.SERVICE_DOC_FILE);
    this.nonProdPortOverride();
  }

  /**
   * Returns a populated instance of the  Service class.
   */
  public get Service(): Service {
    return this.service;
  }

  /**
   * If environment is not production, override the HTTP port if a
   * service-specific alternative is found.
   */
  private nonProdPortOverride() {
    switch (this.service.Name) {
      case 'maze': {
        if (process.env.HTTP_PORT_MAZE) {
          this.HTTP_PORT = parseInt(process.env.HTTP_PORT_MAZE + '', 10);
          log.debug(__filename, 'nonProdPortOverride()', `Non-prod service port for ${this.service.Name} override: HTTP_PORT is now ${this.HTTP_PORT} `);
        }
        break;
      }
      case 'team': {
        if (process.env.HTTP_PORT_TEAM) {
          this.HTTP_PORT = parseInt(process.env.HTTP_PORT_TEAM + '', 10);
          log.debug(__filename, 'nonProdPortOverride()', `Non-prod service port for ${this.service.Name} override: HTTP_PORT is now ${this.HTTP_PORT} `);
        }
        break;
      }
      case 'score': {
        if (process.env.HTTP_PORT_SCORE) {
          this.HTTP_PORT = parseInt(process.env.HTTP_PORT_SCORE + '', 10);
          log.debug(__filename, 'nonProdPortOverride()', `Non-prod service port for ${this.service.Name} override: HTTP_PORT is now ${this.HTTP_PORT} `);
        }
        break;
      }
      case 'trophy': {
        if (process.env.HTTP_PORT_TROPHY) {
          this.HTTP_PORT = parseInt(process.env.HTTP_PORT_TROPHY + '', 10);
          log.debug(__filename, 'nonProdPortOverride()', `Non-prod service port for ${this.service.Name} override: HTTP_PORT is now ${this.HTTP_PORT} `);
        }
        break;
      }
    }
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
    const val = process.env[varName];

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
      case 'json-string': {
        // OpenShift's config map keeps adding extra quotes around the JSON string - check for them here and correct them
        let jVal: string = val + '';
        if (jVal.substr(0, 1) === '"') {
          jVal = jVal.substr(1, jVal.length - 2);
        }
        return JSON.parse(jVal + '');
      }
      default: {
        // we only want numbers or strings...
        this.doError(
          `getVar(${varName}, ${typeName})`,
          'Argument Error',
          `Invalid variable type name: ${typeName}. Valid type names are: string, number, json-string.`,
        );
      }
    }
  };

  /**
   * Wrapping log.error to clean things up a little
   *
   * @param method
   * @param title
   * @param message
   */
  private doError(method: string, title: string, message: string) {
    const err = new Error(message);
    log.error(__filename, method, title + ' ->', err);
    throw err;
  }
}

export default Config;
