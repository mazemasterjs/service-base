"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@mazemasterjs/logger");
const Config_1 = require("./Config");
const config = Config_1.Config.getInstance();
const log = logger_1.Logger.getInstance();
class Security {
    // singleton pattern - constructor is private, use static Secirotu.getInstance()
    constructor() { }
    /**
     * Instantiate and/or returns class instance
     */
    static getInstance() {
        if (this.instance === undefined) {
            this.instance = new Security();
        }
        return this.instance;
    }
    /**
     * Searches the authedUsers array and the user doc (if found).
     * If the user is not found, {} is returned.
     *
     * @param userName
     * @return {USER_ROLE}
     */
    getUserCreds(userName) {
        const authedUser = Security.authedUsers.find(user => {
            return user.userName.toLowerCase() === userName.toLowerCase();
        });
        if (authedUser !== undefined) {
            return authedUser;
        }
        else {
            return null;
        }
    }
    /**
     * Parse / decode the auth header to get user name, get the user object from the
     * auth cache, then return true if they meet the given role requirement
     *
     * @param authHeader
     * @param minRole
     */
    userHasRole(authHeader, minRole) {
        if (authHeader !== undefined) {
            const fields = authHeader.split(' ');
            if (fields.length > 0) {
                const b64Creds = fields.pop();
                if (b64Creds !== undefined && b64Creds.length > 0) {
                    const creds = Buffer.alloc(b64Creds.length, b64Creds, 'base64')
                        .toString('ascii')
                        .split(':');
                    const user = this.getUserCreds(creds[0]);
                    if (user !== null) {
                        return user.role >= minRole;
                    }
                }
            }
        }
        return false;
    }
    /**
     * Add user to the authedUsers cache - if they're already in the cache
     * update that array element instead
     *
     * @param authedUser
     */
    cacheAuthedUser(authedUser) {
        const method = `cacheAuthedUser(${authedUser.userName})`;
        const cacheIdx = Security.authedUsers.findIndex(user => {
            return user.userName === authedUser.userName;
        });
        if (cacheIdx !== -1) {
            log.debug(__filename, method, 'User credentials already cached, refreshing login date.');
            Security.authedUsers[cacheIdx] = authedUser;
        }
        else {
            log.debug(__filename, method, `User credentials added to cache, ${Security.authedUsers.length} currently cached.`);
            Security.authedUsers.push(authedUser);
        }
        // we have something in cache, so start the expiration timer
        if (Security.expirationTimer === undefined) {
            log.debug(__filename, method, `Starting expiration timer.`);
            Security.expirationTimer = setInterval(this.expireCredentials, config.AUTH_CACHE_CHECK_INTERVAL);
        }
    }
    /**
     * Periodically check for users with expired credentials
     * (currently set to a very generous seven days) and
     * remove them from the cache (by rebuilding it without them)
     */
    expireCredentials() {
        log.debug(__filename, 'expireCredentials()', 'Checking for expired credentials...');
        if (Security.authedUsers === undefined || Security.authedUsers.length === 0) {
            log.debug(__filename, 'expireCredentials()', 'Nothing to expire.');
            return;
        }
        const now = Date.now();
        const validUsers = new Array();
        Security.authedUsers.forEach(user => {
            if (now - user.lastLogin < config.AUTH_CACHE_LIFESPAN) {
                validUsers.push(user);
            }
            else {
                log.debug(__filename, 'expireCredentials()', `User ${user.userName}'s credentials are expired. User evicted from authedUsers cache.`);
            }
        });
        Security.authedUsers = validUsers;
    }
}
// private member vars
Security.authedUsers = new Array();
exports.Security = Security;
exports.default = Security;
//# sourceMappingURL=Security.js.map