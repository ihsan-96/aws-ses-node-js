module.exports = {
    logging: {
        name: 'email-sender',
        path: './'
    },
    mail: {
        from: 'example@gmail.com',
        to: 'example@gmail.com',
        replyTo: 'example@gmail.com',
        subject: 'This is a Test Mail',
        text: 'This is a mail content',
        html: '<b>This is a mail content</b>'
    }
};
