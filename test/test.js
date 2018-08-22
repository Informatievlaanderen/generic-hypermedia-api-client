"use strict";
exports.__esModule = true;
var ApiClient_1 = require("../lib/ApiClient");
var MetadataApiHandler_1 = require("../lib/MetadataApiHandler");
//FAIL: TypeScript compiler encountered syntax errors while transpiling. Errors: ',' expected.,'finally' expected.
test('ApiClient constructor', function () {
    var client = new ApiClient_1.ApiClient({});
    expect(client).toBeInstanceOf(ApiClient_1.ApiClient);
});
describe('Generic Hypermedia API', function () {
    describe('The ApiClient module', function () {
        it('should be an ApiClient constructor', function () {
            expect(new ApiClient_1.ApiClient({})).toBeInstanceOf(ApiClient_1.ApiClient);
        });
        //Extra  tests?
    });
    describe('An ApiClient instance', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        //MOCKUP FOR FETCH METHOD
    });
    describe('The MetadataApiHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be a MetadataApiHandler constructor', function () {
            expect(new MetadataApiHandler_1.MetadataApiHandler({ metadataCallback: function (metadata) { }, apiClient: client, subjectStream: client.subjectStream, followDocumentationLink: true }))
                .toBeInstanceOf(MetadataApiHandler_1.MetadataApiHandler);
        });
    });
});
