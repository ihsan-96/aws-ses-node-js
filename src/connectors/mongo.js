const { MongoClient: mongo } = require('mongodb');

const appConfig = require('./../app-config');

class Mongo {

    constructor() {
        this.db = {};
        this.log = null;
        this.restrictedMails = new Set();
    }

    get db() {
        return this.db;
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

    updateRestrictedMails() {
        const config = await this.db.collection('config').findOne({_id:1});
        this.restrictedMails = new Set(...config.bounced_mails, ...config.complained_mails);
    }

    get restrictedMails() {
        return this.restrictedMails;
    }
}

module.exports = new Mongo();
