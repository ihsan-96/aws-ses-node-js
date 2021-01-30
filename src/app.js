// Require objects.
const express = require('express');
const app     = express();
const aws     = require('aws-sdk');
const bunyan = require('bunyan');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');

// Require custom modules
let Server = require('./server.js');
let Handler = require('./handlers/handler.js');

// Load your AWS credentials and try to instantiate the object.
aws.config.loadFromPath(__dirname + '/aws-config.json');

// Loading config
const appConfig = require('./app-config.js');

// Using generic middlewares
app.use(compression());
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(Server.prepareRequest);

// Edit this for the usecases.
const fromEmail   = "hello@example.com";
const portToServe = appConfig.port || 80;

// Instantiate SES.
const ses = new aws.SES();

// Initialising logger
const log = bunyan.createLogger({
    name: appConfig.logging.name,
    streams: [
        {
            path: appConfig.logging.path
        }
    ]
});

Server = new Server(log);

// Health Check
app.get('/', (req, res) => {
    res.json({
        status: 'OK'
    });
});

// Verify email addresses.
app.get('/verify', function (req, res) {
    const params = {
        EmailAddress: fromEmail
    };
    
    ses.verifyEmailAddress(params, function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
            res.send(data);
        } 
    });
});

// Listing the verified email addresses.
app.get('/list', function (req, res) {
    ses.listVerifiedEmailAddresses(function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
            res.send(data);
        } 
    });
});

app.get('/bounced', async (req, res) => {
    if (!req.query.mailId) {
        log.info(req.query, 'Invalid request for mark bounce');
        return res.status(400).json({error: 'Email ID not present in query'});
    }
    log.info(req.query, 'Successful request for mark bounce');

    const updated = await Handler.addMailToBounced(req.query.mailId, log);

    if (updated) {
        return res.status(200).json({updated});
    }
    log.error(req.query, 'marking bounced mail failed');
    res.status(400).json({error: 'adding bounce email failed'});
});

app.post('/complained', async (req, res) => {
    if (!req.query.mailId || !req.body.complaint ) {
        log.info(req.query, 'Invalid request for mark complaint');
        return res.status(400).json({error: 'Email ID or complaint or both not present'});
    }
    log.info({...req.query, ...req.body}, 'Successful request for mark complaint');

    const [updatedConfig, updatedComplaint] = await Handler.addMailToComplaint(req.query.mailId, req.body.complaint, log);

    if (updatedConfig && updatedComplaint) {
        return res.status(200).json({config: updatedConfig, complaint: updatedComplaint});
    }
    log.error(req.query, 'marking complaint mail failed');
    res.status(400).json({error: 'adding complant email failed'});
});

// Deleting verified email addresses.
app.get('/delete', function (req, res) {
    const params = {
        EmailAddress: fromEmail
    };

    ses.deleteVerifiedEmailAddress(params, function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
            res.send(data);
        } 
    });
});

app.post('/send', (req, res) => {

    const params = req.body.Destination ? req.body : {
        Destination: {
         BccAddresses: appConfig.mail.bcc || [], 
         CcAddresses: appConfig.mail.cc || [], 
         ToAddresses: [
            appConfig.mail.to
         ]
        }, 
        Message: {
         Body: {
          Html: {
           Charset: 'UTF-8', 
           Data: appConfig.mail.html
          }, 
          Text: {
           Charset: 'UTF-8', 
           Data: appConfig.mail.text
          }
         }, 
         Subject: {
          Charset: 'UTF-8', 
          Data: appConfig.mail.subject
         }
        }, 
        ReplyToAddresses: [
            appConfig.mail.replyTo
        ], 
        // ReturnPath: '', 
        // ReturnPathArn: '', 
        // SourceArn: ''
        Source: appConfig.mail.from
    };

    params.Destination = Handler.validateDestination(params.Destination, log);
    
    ses.sendEmail(params, (err, body) => {
        if (err) {
            log.error({error: err.stack, mail: params}, 'Error Occured while sending mail')
        } else {
            log.info(body, 'Mail sent!')
        }
    });
});

// Start server.
Server.start().then(() => {
    const server = app.listen(portToServe, function () {
        const host = server.address().address;
        const port = server.address().port;

        log.info('AWS SES example app listening at http://%s:%s', host, port);
    });
}).catch(e => {
    log.error(e, 'Something Broke');
    // Server.stop()
    //     .then(() => {
    //         log.info('Successfully closing express server!');
    //         process.exit(0);
    //     }).catch(err => {
    //         log.error({
    //             error: err
    //         }, 'Closing express server with errors.!!');
    //         process.exit(1);
    //     });
});


process.on('uncaughtException', err => {
    log.error({
        error: err.stack
    }, 'Uncaught Exception Occured..!!');
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT']) {

    process.on(signal, () => {
        Server.stop()
            .then(() => {
                log.info('Successfully closing express server!');
                process.exit(0);
            }).catch(err => {
                log.error({
                    error: err
                }, 'Closing express server with errors.!!');
                process.exit(1);
            });
    });
}
