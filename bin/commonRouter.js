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
const express_1 = __importDefault(require("express"));
exports.commonRouter = express_1.default.Router();
// map all of the common routes
exports.commonRouter.get('/service', sRt.getServiceDoc);
exports.commonRouter.get('/count', sRt.countDocs);
exports.commonRouter.get('/get', sRt.getDocs);
exports.commonRouter.put('/insert', sRt.insertDoc);
exports.commonRouter.put('/update', sRt.updateDoc);
exports.commonRouter.delete('/delete/:docId', sRt.deleteDoc);
exports.commonRouter.get('/regenerate-default-docs', sRt.generateDocs);
// map the live/ready probes
exports.commonRouter.get('/probes/live', sRt.livenessProbe);
exports.commonRouter.get('/probes/ready', sRt.readinessProbe);
// capture all unhandled requests
exports.commonRouter.get('/*', sRt.unhandledRoute);
exports.commonRouter.put('/*', sRt.unhandledRoute);
exports.commonRouter.delete('/*', sRt.unhandledRoute);
exports.commonRouter.post('/*', sRt.unhandledRoute);
// expose router as module
exports.default = exports.commonRouter;
//# sourceMappingURL=commonRouter.js.map