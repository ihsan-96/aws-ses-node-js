const { MongoClient: mongo } = require('mongodb');

const appConfig = require('./../app-config');

class Mongo {

    constructor() {
        this.db = {};
        this.log = null;
    }
    
    async init(log) {
        this.log = log;
        this.db = await mongo.connect(appConfig.mongo.url || 'mongodb://localhost:27017');
    }

    async close() {
        if (this.db.close) {
            return this.db.close();
        } else {
            return Promise.resolve();
        }
    }
}

module.exports = new Mongo();
