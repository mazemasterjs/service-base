"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
const Service_1 = __importDefault(require("@mazemasterjs/shared-library/Service"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const log = logger_1.default.getInstance();
class Config {
    constructor() {
        /**
         * Gets and returns the value of the requested environment variable
         * as the given type.
         *
         * @param varName - the name of the environment variable to get
         * @param typeName - tye name of the type to return the value as (string | number)
         */
        this.getVar = (varName, typeName) => {
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
    get Service() {
        return this.service;
    }
    /**
     * Loads the given service.json file, creates a Service object from the data,
     * and returns the Service.
     *
     * @param svcDocFile
     */
    loadServiceData(svcDocFile) {
        const svc = new Service_1.default();
        const absDocPath = path_1.default.resolve(svcDocFile);
        // make sure the file exists
        if (!fs_1.default.existsSync(absDocPath)) {
            this.doError(`loadService(${svcDocFile})`, 'Service Error', `${svcDocFile} does not exist. ${this.Service.Name} cannot start.`);
        }
        // load the data into a the service object
        svc.loadFromJson(JSON.parse(fs_1.default.readFileSync(svcDocFile, 'UTF-8')));
        // and return the service
        return svc;
    }
    doError(method, title, message) {
        const err = new Error(message);
        log.error(__filename, method, title + ' ->', err);
        throw err;
    }
}
exports.Config = Config;
exports.default = Config;
//# sourceMappingURL=Config.js.map