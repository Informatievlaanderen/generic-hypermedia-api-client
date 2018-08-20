"use strict";
exports.__esModule = true;
var LanguageHandler_1 = require("./LanguageHandler");
var ApiClient_1 = require("./ApiClient");
var MyMetadataApiHandler_1 = require("./MyMetadataApiHandler");
var PaginationHandler_1 = require("./PaginationHandler");
var VersioningHandler_1 = require("./VersioningHandler");
//https://datapiloten.be/parking/catalog.ttl
//https://graph.irail.be/sncb/connections
//http://localhost:3001/api
try {
    //TODO : add your code snippet here
    var client = new ApiClient_1.ApiClient(null);
    var metadataHandler = new MyMetadataApiHandler_1.MyMetadataApiHandler({
        metadataCallback: function (metadata) { return console.log(metadata); },
        apiClient: client,
        subjectStream: client.subjectStream,
        followDocumentationLink: true
    });
    var pagineringHandler = new PaginationHandler_1.PaginationHandler({
        pagedataCallback: function (pagedata) { return console.log(pagedata); },
        subjectStream: client.subjectStream
    });
    var languageHandler = new LanguageHandler_1.LanguageHandler({
        languageCallback: function (language) {
            language.stream.on('data', function (data) {
                if (typeof data === 'object') {
                    console.log(data.object.value);
                }
                else {
                    console.log(data);
                }
            });
        },
        acceptLanguageHeader: 'nl,en;q=0.8' //Supported languages on the server are nl, en and fr
    });
    var versioningHandler = new VersioningHandler_1.VersioningHandler({
        versionCallback: function (version) {
            version.stream.on('data', function (data) {
                console.log(data);
            });
        },
        apiClient: client,
        followLink: false,
        datetime: new Date(2018, 8, 14)
    });
    client.fetch('http://localhost:3001/api', [metadataHandler]);
}
catch (e) {
    console.log(e);
}
