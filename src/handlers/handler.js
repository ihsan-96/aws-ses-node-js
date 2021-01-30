'use strict';

const mongo = require('../connectors/mongo.js');

exports.addMailToBounced = async (mailId, log) => {
    const updated = await mongo.getdb().collection('config').update({_id : 1}, {'$addToSet' : {'bounced_mails': mailId}})
        .catch(log.error);

    mongo.updateRestrictedMails();

    return updated && updated.result;
}

exports.addMailToComplaint = async (mailId, complaint, log) => {
    const updatedConfig = await mongo.getdb().collection('config').update({_id : 1}, {'$addToSet' : {'complained_mails': mailId}})
        .catch(log.error);

    const updatedComplaint = await mongo.getdb().collection('complaints').insert({mailId, complaint})
        .catch(log.error);

    mongo.updateRestrictedMails();

    return [updatedConfig && updatedConfig.result, updatedComplaint && updatedComplaint.result];
}

exports.validateDestination = (destination, log) => {
    if (!destination) {
        return null;
    }
    if (destination.BccAddresses) {
        const bccCount = destination.BccAddresses.length;
        destination.BccAddresses = destination.BccAddresses.filter(e => !mongo.getRestrictedMails().has(e));
        if (bccCount !== destination.BccAddresses.length) {
            log.info('restricted mails found in bcc was removed');
        }
    }
    if (destination.CcAddresses) {
        const ccCount = destination.CcAddresses.length;
        destination.CcAddresses = destination.CcAddresses.filter(e => !mongo.getRestrictedMails().has(e));
        if (ccCount !== destination.CcAddresses.length) {
            log.info('restricted mails found in cc was removed');
        }
    }
    if (destination.ToAddresses) {
        const toCount = destination.ToAddresses.length;
        destination.ToAddresses = destination.ToAddresses.filter(e => !mongo.getRestrictedMails().has(e));
        if (toCount !== destination.ToAddresses.length) {
            log.info('restricted mails found in to was removed');
        }
    }

    return destination;
}
