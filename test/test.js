"use strict";
exports.__esModule = true;
var ApiClient_1 = require("../lib/ApiClient");
var MetadataApiHandler_1 = require("../lib/MetadataApiHandler");
var PaginationHandler_1 = require("../lib/PaginationHandler");
var LanguageHandler_1 = require("../lib/LanguageHandler");
var VersioningHandler_1 = require("../lib/VersioningHandler");
var FullTextSearchHandler_1 = require("../lib/FullTextSearchHandler");
var CRUDHandler_1 = require("../lib/CRUDHandler");
describe('Generic Hypermedia API', function () {
    describe('The ApiClient module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be an ApiClient constructor', function () {
            expect(new ApiClient_1.ApiClient({})).toBeInstanceOf(ApiClient_1.ApiClient);
        });
        //MOCKUP FOR FETCH METHOD
    });
    describe('The MetadataApiHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be a MetadataApiHandler constructor', function () {
            expect(new MetadataApiHandler_1.MetadataApiHandler({ metadataCallback: function (metadata) { }, apiClient: client, followDocumentationLink: true }))
                .toBeInstanceOf(MetadataApiHandler_1.MetadataApiHandler);
        });
    });
    describe('The PaginationHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be a PaginationHandler constructor', function () {
            expect(new PaginationHandler_1.PaginationHandler({ pagedataCallback: function (pagedata) { }, subjectStream: client.subjectStream })).toBeInstanceOf(PaginationHandler_1.PaginationHandler);
        });
    });
    describe('The LanguageHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be a LanguageHandler constructor', function () {
            expect(new LanguageHandler_1.LanguageHandler({ languageCallback: function (languageData) { }, acceptLanguageHeader: 'nl-BE' })).toBeInstanceOf(LanguageHandler_1.LanguageHandler);
        });
    });
    describe('The VersioningHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be a VersioningHandler constructor', function () {
            expect(new VersioningHandler_1.VersioningHandler({ versionCallback: function (versionData) { }, apiClient: client, datetime: new Date(2018, 8, 24) }))
                .toBeInstanceOf(VersioningHandler_1.VersioningHandler);
        });
    });
    describe('The FullTextSearchHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be a FullTextSearchHandler constructor without queryKeys', function () {
            expect(new FullTextSearchHandler_1.FullTextSearchHandler({ callback: function (data) { }, apiClient: client, queryValues: ['Bob'] })).toBeInstanceOf(FullTextSearchHandler_1.FullTextSearchHandler);
        });
        it('should be a FullTextSearchHandler constructor with queryKeys', function () {
            expect(new FullTextSearchHandler_1.FullTextSearchHandler({ callback: function (data) { }, apiClient: client, queryValues: ['Bob'], queryKeys: ['Naam'] })).toBeInstanceOf(FullTextSearchHandler_1.FullTextSearchHandler);
        });
    });
    describe('The CRUDHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
        });
        it('should be a CRUDHandler constructor', function () {
            expect(new CRUDHandler_1.CRUDHandler({ crudCallback: function (crudData) { } })).toBeInstanceOf(CRUDHandler_1.CRUDHandler);
        });
    });
});
