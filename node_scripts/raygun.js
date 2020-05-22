"use strict";

var fs = require('fs'),
    request = require('request'),
    dir = require('node-dir');

var base = process.cwd() + '\\dist\\js';

// lose 'node' and script path
process.argv.shift();
process.argv.shift();

var appid = 'czqn4r'; // staging

if (process.argv.length && process.argv.shift() == 'prod') {
  appid = 'czqq1n';
}

const raygunApiUrl = "https://app.raygun.com/upload/jssymbols/" + appid + "?authToken=" + "x9E71RVDiRLooZATPrJLflpsLOGZCCZH";

dir.files(base, function(err, files) {
    if (err) throw err;

    var upload = files.filter(function (file) {
        var ext = file.split('.').pop();
        return ext == 'js' || ext == 'map';
    });

    upload = upload.map(function (file) {
        var stat = fs.statSync(file);
        var urlPrefix =
            file.indexOf('main-built.js') >= 0
            || file.indexOf('account-built.js') >= 0
            || file.indexOf('templates-built.js') >= 0
            || file.indexOf('libs-built.js') >= 0
            || file.indexOf('vendor-built.js') >= 0
            ? 'https://activelylearn.com'
            : 'https://activelylearn.com/js';

        return {
            file: file,
            local: file.substr(process.cwd().length + 1).replace(/\\/g, "/"),
            url: urlPrefix + file.substr(base.length).replace(/\\/g, "/"),
            contentType: file.substr(file.length - 3) === '.js' ? 'text/javascript' : 'application/json',
            size: stat.size
        };
    });

    var sent = 0;
    var thisBatchCompleted = 0;
    var batchSize = 25;

    batchSend();

    function batchSend() {
        var thisBatchSent = 0;

        console.log('\nBatch: ' + Math.floor(1 + sent/batchSize));
        for (var i = sent; i < upload.length && thisBatchSent < batchSize; i++) {
            sent++;
            thisBatchSent++;

            sendFile(upload[i]);
        }
    }

    function sendFile(file) {
        request({
            method: 'POST',
            uri: raygunApiUrl,
            formData: {
                url: file.url,
                file: fs.createReadStream(file.local),
            },
        }, function(error, response, body) {
            thisBatchCompleted++;
            if (thisBatchCompleted == batchSize) {
                thisBatchCompleted = 0;
                batchSend();
            }
        });
    }
});