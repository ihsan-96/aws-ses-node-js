// Require objects.
const express = require('express');
const app     = express();
const aws     = require('aws-sdk');
const bunyan = require('bunyan');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');

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
         BccAddresses: [], 
         CcAddresses: [], 
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
    
    ses.sendEmail(params, (err, body) => {
        if (err) {
            log.error({error: err.stack, mail: params}, 'Error Occured while sending mail')
        } else {
            log.info(body, 'Mail sent!')
        }
    });
});

// Start server.
const server = app.listen(portToServe, function () {
    const host = server.address().address;
    const port = server.address().port;

    log.info('AWS SES example app listening at http://%s:%s', host, port);
});
