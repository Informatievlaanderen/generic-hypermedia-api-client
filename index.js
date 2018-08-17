"use strict";
exports.__esModule = true;
var ApiClient_1 = require("./ApiClient");
var VersioningHandler_1 = require("./VersioningHandler");
//TEST PROGRAM
//https://datapiloten.be/parking/catalog.ttl
//https://graph.irail.be/sncb/connections
//http://localhost:3001/api
try {
    var client = new ApiClient_1.ApiClient(null);
    client.fetch('http://localhost:3001/api/versioning', [
        /*new MyMetadataApiHandler(
            {
                metadataCallback: (metadata) => console.log(metadata),
                apiClient: client,
                followDocumentationLink: true,
                subjectStream: client.subjectStream
            }
        ),
        new PaginationHandler(
            {
                pagedataCallback: (pagedata) => console.log(pagedata),
                subjectStream: client.subjectStream
            }
        ),
        new LanguageHandler(
            {
                languageCallback: (language) => {
                    language.stream.on('data', (data) => {
                        if (typeof data == 'object') {
                            console.log(data.object.value);
                        } else {
                            console.log(data);
                        }
                    })
                },
                acceptLanguageHeader: 'nl,en;q=0.8'
            }
        ),*/
        new VersioningHandler_1.VersioningHandler({
            versionCallback: function (version) {
                version.stream.on('data', function () {
                    console.log('');
                });
            },
            datetime: new Date(2018, 8, 14)
            //version: '3.1'
        })
    ]);
}
catch (e) {
    console.log(e);
}
