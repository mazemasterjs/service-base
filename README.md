# service-base

RESTful Service APIs for Maze, Team, Score, and Trophy data. When started, this project will use the SERVICE_DOC_FILE environment variable to load
the designated \*-service.json file into memory and use it's settings to configure it target collections and endpoints.

## Details

- MazeMasterJS services are RESTful APIs built with Node/Express
- Each service with a /data/\*-service.json file is hosted as an individual pod in our OpenShift cluster.
- See the individual \*-service.json files in https://github.com/mazemasterjs/service-base/tree/development/data for a complete list of endpoints and arguments.

## Notes

- This project is connected to OpenShift - when a PR against master is completed, the CD pipeline kicks in and OpenShift pulls the repo, creates a new container image, and attempts to deploy it to the cluster. Unless the build / deploy fails, changes will be live within a minute of the PR being completed.

## Global Endpoints

- get: '/service' - returns the service document
- get: '/count' - Returns count of all documents in the service collection
- get: '/count?key=val...' - Returns count of all documents in the service collection matching the query parameters (e.g. api/maze/count?height=3)
- get: '/get' - Returns all documents (or stubbed data if performance concerns exist, as with mazes)
- get: '/get?key=val...' - Returns all documents from the service collection that match the query parameters (e.g. api/score?teamId=MyTeamId)
- get: '/get?key=val&stub=true' - Adding the stub=true parameter returns a subset of matching data for certain collections (mazes and teams as of v1.0.0)
- put: '/insert' - Validates and inserts a the JSON document body into the service collection.
- put: '/update' - Validates and updates a document in the service collection with the JSON document body.
- delete: '/delete/:docId' - Delete a single document with a matching docId from the service collection.

## Team: BotCode Endpoints

- get: '/count/botCode' - Returns the total count of bot code documents in the bot_code collection
- get: '/count/botCode?botId=STRING' - Returns the total count of bot code documents with the matching botId
- get: '/get/botCode?botId=STRING' - Returns all bot code documents from the bot_code collection that match the given botId (e.g. /get?botId=234ABC)
- get: '/get/botCode?botId=STRING&version=NUMBER' - Returns the versioned code document for the given bot id (e.g. /get?botId=234ABC&version=3)
- put: '/insert/botCode' - Inserts a new, versioned bot code document.
- put: '/update/botCode' - Updates an existing version of a bot code document.
- delete: '/delete/botCode/:botId/:version' - Deletes a single bot code document with matching botId and version.

## Team: User Endpoints

- get: '/count/user' - Returns the total count of user documents in the users collection
- get: '/count/user?userId=STRING' - Returns the total count of user documents with the matching userId
- get: '/get/user?userId=STRING' - Returns all user documents from the bot_code collection that match the given userId (e.g. /get?userId=234ABC)
- get: '/get/user?userId=STRING' - Returns the user document for the given userId (e.g. /get?userId=234ABC)
- put: '/insert/user' - Inserts a new user document.
- put: '/update/user' - Updates an existing user document.
- delete: '/delete/user/:userId' - Deletes a single user document with matching userId

## Maze: Special Endpoints

- get: '/generate/{height}/{width}/{challenge}/{name}/{seed}' - Generates a new maze document from the given parameters. The maze is NOT automatically inserted into the database.
- get: '/regenerate-default-docs' - Delete, generate, and insert default documents from default-SERVICE-list.json. Applies only to the maze and trophy services.

## Trophy: Special Endpoints

- get: '/regenerate-default-docs' - Delete, generate, and insert default documents from default-SERVICE-list.json. Applies only to the maze and trophy services.

## Change Log

### v1.2.2

- Fixed issue in userAuth - cached user credentials now validated on every request

### v1.2.1

- Added Security class to handle server-side credential caching and basic RBAC
- Installed basic-auth middleware - all non-authenticated requests will not fail with error 401 (not authorized)
- All routes, except for live/ready probes, now require a user be authenticated with a proper role assinged. USER_ROLES: NONE, USER, ASSISTANT, INSTRUCTOR, ADMIN
  - (most service endpoints require ASSISTANT or better)
- Added series of /user endpoints to the TEAM service (again, because we're low on OpenShift capacity)
- Two new env vars are required to start a local service:
  - AUTH_CACHE_LIFESPAN=604800000 // This tells the service how long to allow credentials to live (currently 7 days)
  - AUTH_CACHE_CHECK_INTERVAL=28800000 // The frequency at which the service will check for and invalidate expired credentials (currently 8 hours)
- If an account recieves a role change, the server will probably have to be restarted before the changes will show up. To-do in place for that...

### v1.1.0

- Added endpoints to service-base/team for managing versioned bot code documents.
  - Note: I added these to team because we're out of capacity on OpenShift!

### v1.0.9

- getDocs() now returns 404 if no documents were found

### v1.0.7

- Added some manipulation around JSON environment variable strings to accomodate openshifts config map value management

### v1.0.6

- Added lastUpdated field to Score for query sorting.
- Insert and Update functions now auto-update Score.lastUpdated during write
- Updated shared-library version to latest: 1.8.7

### v1.0.5

- Removed count and lastUpdated fields from trophy data

### v1.0.4

- Updated with new database-manager dependency
- Added support for internal sorting on getDocuments() calls. maze/get sorts by height, width, challenge, team/get sorts by name, score/get sorts by lastUpdated, and trophy/get sorts by name
- Moved sort and projection keys into environment variables so they can be changed directly on the server

### v1.0.3

- Updated dependencies to pick up maze.generate() number -> string type recasting issue
- Shortened the names of source files

### v1.0.1

- Changed scope of most member vars in ConfigService to readonly

### v1.0.0

- First full release - all services are now running on service-base

## TODO

- Need to add stub feature for scores and trophies
