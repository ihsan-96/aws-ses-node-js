const { MongoClient: mongo } = require('mongodb');

const appConfig = require('./../app-config');

class Mongo {

    constructor() {
        this.db = {};
        this.client = {};
        this.log = null;
        this.restrictedMails = new Set();
    }

    getdb() {
        return this.db;
    }
    
    async init(log) {
        this.log = log;
        this.client = await mongo.connect(appConfig.mongo.url || 'mongodb://localhost:27017');
        this.db = this.client.db('mailer');
    }

    async close() {
        if (this.client.close) {
            return this.client.close();
        } else {
            return Promise.resolve();
        }
    }

    async updateRestrictedMails() {
        const config = await this.db.collection('config').findOne({_id:1});
        this.restrictedMails = new Set(...config.bounced_mails, ...config.complained_mails);
    }

    getRestrictedMails() {
        return this.restrictedMails;
    }
}

module.exports = new Mongo();
