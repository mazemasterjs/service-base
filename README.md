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
- get: '/get?key=val...' - Returns all documents from the service collection that match the query parameters (e.g. api/score/teamId=?MyTeamId)
- get: '/get?key=val...&stub=true' - Adding the stub=true parameter returns a subset of matching data for certain collections (mazes and teams as of v1.0.0)
- put: '/insert' - Validates and inserts a the JSON document in request.body into the service collection.
- put: '/update' - Validates and updates a document in the service collection with the JSON document in request.body.
- delete: '/delete/:docId - Delete a single document with a matching docId from the service collection.

## Maze: Special Endpoints

- get: '/generate/{height}/{width}/{challenge}/{name}/{seed} - Generates a new maze document from the given parameters. The maze is NOT automatically inserted into the database.
- get: '/regenerate-default-docs - Delete, generate, and insert default documents from default-SERVICE-list.json. Applies only to the maze and trophy services.

## Trophy: Special Endpoints

- get: '/regenerate-default-docs - Delete, generate, and insert default documents from default-SERVICE-list.json. Applies only to the maze and trophy services.

## Change Log

### v1.0.0

- First full release - all services are now running on service-base

## TODO

- Need to add stub feature for scores and trophies
