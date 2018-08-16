"use strict";
exports.__esModule = true;
var ApiClient_1 = require("../ApiClient");
var MyMetadataApiHandler_1 = require("../MyMetadataApiHandler");
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
    describe('The MyMetadataApiHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be a MyMetadataApiHandler constructor', function () {
            expect(new MyMetadataApiHandler_1.MyMetadataApiHandler({ metadataCallback: function (metadata) { }, apiClient: client, subjectStream: client.subjectStream, followDocumentationLink: true }))
                .toBeInstanceOf(MyMetadataApiHandler_1.MyMetadataApiHandler);
        });
    });
});
