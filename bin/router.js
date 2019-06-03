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
const routes = __importStar(require("./routes"));
const express_1 = __importDefault(require("express"));
const Config_1 = __importDefault(require("./Config"));
exports.router = express_1.default.Router();
// load the service config
const config = Config_1.default.getInstance();
// map all of the common routes
exports.router.get('/service', routes.getServiceDoc);
exports.router.get('/count', routes.countDocs);
exports.router.get('/get', routes.getDocs);
exports.router.put('/insert', routes.insertDoc);
exports.router.put('/update', routes.updateDoc);
exports.router.delete('/delete/:docId', routes.deleteDoc);
// maze-specific routes
if (config.Service.Name === 'maze') {
    exports.router.get('/regenerate-default-docs', routes.generateDocs);
    exports.router.get('/generate/:height/:width/:challenge/:name/:seed', routes.generateMaze);
}
// trophy-specific routes
if (config.Service.Name === 'trophy') {
    exports.router.get('/regenerate-default-docs', routes.generateDocs);
}
// map the live/ready probes
exports.router.get('/probes/live', routes.livenessProbe);
exports.router.get('/probes/ready', routes.readinessProbe);
// capture all unhandled requests
exports.router.get('/*', routes.unhandledRoute);
exports.router.put('/*', routes.unhandledRoute);
exports.router.delete('/*', routes.unhandledRoute);
exports.router.post('/*', routes.unhandledRoute);
// expose router as module
exports.default = exports.router;
//# sourceMappingURL=router.js.map