"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
exports.__esModule = true;
var ApiClient_1 = require("../lib/ApiClient");
var CRUDHandler_1 = require("../lib/CRUDHandler");
var FullTextSearchHandler_1 = require("../lib/FullTextSearchHandler");
var VersioningHandler_1 = require("../lib/VersioningHandler");
var LanguageHandler_1 = require("../lib/LanguageHandler");
var PaginationHandler_1 = require("../lib/PaginationHandler");
var MetadataApiHandler_1 = require("../lib/MetadataApiHandler");
var RDF = require('rdf-ext');
var JsonLdParser = require('rdf-parser-jsonld');
var N3Parser = require('rdf-parser-n3');
var stringToStream = require('string-to-stream');
var formats = require('rdf-formats-common')(RDF);
var stream = require('stream');
require('es6-promise').polyfill();
require('isomorphic-fetch');
var fetchMock = require('fetch-mock');
describe('Generic Hypermedia API', function () {
    describe('The ApiClient module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
            fetchMock.restore();
        });
        it('should be an ApiClient constructor', function () {
            expect(new ApiClient_1.ApiClient({})).toBeInstanceOf(ApiClient_1.ApiClient);
        });
        it('should fetch a given URL', function () { return __awaiter(_this, void 0, void 0, function () {
            var data, response, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = { test: '1234' };
                        fetchMock.get('http://example.org', data);
                        return [4 /*yield*/, fetch('http://example.org')];
                    case 1:
                        response = _a.sent();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        result = _a.sent();
                        expect(result).toEqual(result);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('The parser selection module', function () {
        it('should select the correct parser', function () {
            expect(formats.parsers.find('application/ld+json')).toBeInstanceOf(JsonLdParser);
            expect(formats.parsers.find('text/turtle')).toBeInstanceOf(N3Parser);
        });
    });
    describe('The MetadataApiHandler module', function () {
        var client;
        var stream;
        var parser;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
            parser = formats.parsers.find('application/ld+json');
            fetchMock.restore();
        });
        afterEach(function () {
            if (stream) {
                stream.unshift(null);
            }
        });
        it('should be a MetadataApiHandler constructor', function () {
            expect(new MetadataApiHandler_1.MetadataApiHandler({ metadataCallback: function (metadata) { }, apiClient: client, followDocumentationLink: true }))
                .toBeInstanceOf(MetadataApiHandler_1.MetadataApiHandler);
        });
        it('should throw an error if no metadataCallback was given', function () {
            expect(function () { MetadataApiHandler_1.MetadataApiHandler({ apiClient: client }); }).toThrow();
        });
        it('should throw an error if no apiClient was given', function () {
            expect(function () { MetadataApiHandler_1.MetadataApiHandler({ metadataCallback: function (metadata) { } }); }).toThrow();
        });
        //TODO : test onFetch
        it('should return metadata if there is found and NOT follow the documentation link if found', function () { return __awaiter(_this, void 0, void 0, function () {
            var doc, result, metadataHandler, expected;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        doc = {
                            "@context": [
                                "http://www.w3.org/ns/hydra/context.jsonld",
                                "https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/1.1/dcat-ap_1.1.jsonld",
                                {
                                    "hydra": "http://www.w3.org/ns/hydra/core#",
                                    "dc": "http://purl.org/dc/terms/",
                                    "dcat": "https://www.w3.org/ns/dcat#",
                                    "hydra:apiDocumentation": { "@type": "@id" }
                                }
                            ],
                            "@id": "/api",
                            "@type": ["EntryPoint", "Distribution"],
                            "hydra:apiDocumentation": "/api/documentation",
                            "dc:issued": "2016-01-10",
                            "dc:modified": "2018-07-24"
                        };
                        result = {};
                        metadataHandler = new MetadataApiHandler_1.MetadataApiHandler({
                            metadataCallback: function (metadata) { return result = metadata; },
                            apiClient: client,
                            followDocumentationLink: false
                        });
                        //TODO: find other way to do this.
                        metadataHandler.subjectURLs.push('http://example.org/api');
                        stream = new parser.Impl(stringToStream(JSON.stringify(doc)), { baseIRI: 'http://example.org' });
                        stream.on('data', function (quad) {
                            metadataHandler.onQuad(quad);
                        });
                        return [4 /*yield*/, new Promise((function (resolve) { return stream.on('end', resolve); }))];
                    case 1:
                        _a.sent();
                        metadataHandler.onEnd();
                        expected = {
                            apiDocumentation: 'http://example.org/api/documentation',
                            apiIssued: '2016-01-10',
                            apiModified: '2018-07-24'
                        };
                        expect(result).toEqual(expected);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return metadata if there is found and follow the documentation link if found', function () {
            //TODO
        });
    });
    describe('The PaginationHandler module', function () {
        var client;
        var stream;
        var parser;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
            parser = formats.parsers.find('application/ld+json');
            fetchMock.restore();
        });
        afterEach(function () {
            if (stream) {
                stream.unshift(null);
            }
        });
        it('should be a PaginationHandler constructor', function () {
            expect(new PaginationHandler_1.PaginationHandler({ pagedataCallback: function (pagedata) { }, subjectStream: client.subjectStream })).toBeInstanceOf(PaginationHandler_1.PaginationHandler);
        });
        it('should throw an error if no arguments were given', function () {
            expect(function () { PaginationHandler_1.PaginationHandler({}); }).toThrow();
        });
        it('should extract info from the Link header if present', function () { return __awaiter(_this, void 0, void 0, function () {
            var response, result, paginationHandler, expected;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fetchMock.get('http://google.com', {
                            status: 200,
                            headers: {
                                'link': '<https://google.com/api/resource?page=4&limit=100>; rel="next"'
                            }
                        });
                        return [4 /*yield*/, fetch('http://google.com')];
                    case 1:
                        response = _a.sent();
                        result = {};
                        paginationHandler = new PaginationHandler_1.PaginationHandler({
                            pagedataCallback: function (data) { result = data; },
                            subjectStream: client.subjectStream
                        });
                        paginationHandler.onFetch(response);
                        paginationHandler.onEnd();
                        expected = {
                            first: null,
                            next: 'https://google.com/api/resource?page=4&limit=100',
                            last: null,
                            prev: null
                        };
                        expect(result).toEqual(expected);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return pagedate if found', function () { return __awaiter(_this, void 0, void 0, function () {
            var doc, result, paginationHandler, expected;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        doc = {
                            "@context": "http://www.w3.org/ns/hydra/context.jsonld",
                            "@id": "/api/pagination",
                            "@type": "PartialCollection",
                            "next": "/api/resource?page=4",
                            "previous": "/api/resource?page=2"
                        };
                        result = {};
                        paginationHandler = new PaginationHandler_1.PaginationHandler({
                            pagedataCallback: function (pagedata) { result = pagedata; },
                            subjectStream: client.subjectStream
                        });
                        paginationHandler.subjectURLs.push('http://example.org/api/pagination');
                        stream = new parser.Impl(stringToStream(JSON.stringify(doc)), { baseIRI: 'http://example.org' });
                        stream.on('data', function (quad) {
                            paginationHandler.onQuad(quad);
                        });
                        return [4 /*yield*/, new Promise((function (resolve) { return stream.on('end', resolve); }))];
                    case 1:
                        _a.sent();
                        paginationHandler.onEnd();
                        expected = {
                            first: null,
                            last: null,
                            next: 'http://example.org/api/resource?page=4',
                            prev: 'http://example.org/api/resource?page=2'
                        };
                        expect(result).toEqual(expected);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('The LanguageHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
            fetchMock.restore();
        });
        it('should be a LanguageHandler constructor', function () {
            expect(new LanguageHandler_1.LanguageHandler({ languageCallback: function (languageData) { }, acceptLanguageHeader: 'nl-BE' })).toBeInstanceOf(LanguageHandler_1.LanguageHandler);
        });
        it('should throw an error if no arguments were given', function () {
            expect(function () { LanguageHandler_1.LanguageHandler({}); }).toThrow();
        });
        //TODO : test onFetch
        it('should throw an error if server does not support the requested languages', function () { return __awaiter(_this, void 0, void 0, function () {
            var data, response, languageHandler;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = { test: '1234' };
                        fetchMock.get('http://google.com', {
                            status: 400
                        });
                        return [4 /*yield*/, fetch('http://google.com')];
                    case 1:
                        response = _a.sent();
                        languageHandler = new LanguageHandler_1.LanguageHandler({
                            languageCallback: function (data) { },
                            acceptLanguageHeader: 'nl'
                        });
                        languageHandler.onFetch(response);
                        expect(function () { return languageHandler; }).toThrow();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should extract the by server chosen language from the Content-Language header', function () { return __awaiter(_this, void 0, void 0, function () {
            var response, language, languageHandler;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fetchMock.get('http://example.org', {
                            status: 200,
                            headers: {
                                'content-language': 'en'
                            }
                        });
                        return [4 /*yield*/, fetch('http://example.org')];
                    case 1:
                        response = _a.sent();
                        language = '';
                        languageHandler = new LanguageHandler_1.LanguageHandler({
                            languageCallback: function (data) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    data.stream.on('data', function (data) {
                                        language = data;
                                    });
                                    return [2 /*return*/];
                                });
                            }); },
                            acceptLanguageHeader: 'en;q=0.9,fr;q=0.6'
                        });
                        languageHandler.onFetch(response);
                        //We have to wait for the stream to stop
                        expect(language).toEqual('en');
                        return [2 /*return*/];
                }
            });
        }); });
        //TODO : test onQuad --> stream
    });
    describe('The VersioningHandler module', function () {
        var client;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
            fetchMock.restore();
        });
        it('should be a VersioningHandler constructor', function () {
            expect(new VersioningHandler_1.VersioningHandler({ versionCallback: function (versionData) { }, apiClient: client, datetime: new Date(2018, 8, 24), followLink: false }))
                .toBeInstanceOf(VersioningHandler_1.VersioningHandler);
        });
        it('should throw an error if no arguments were given', function () {
            expect(function () { VersioningHandler_1.VersioningHandler({}); }).toThrow();
        });
        //TODO : test onFetch
        it('should extract the versioned URL from the Link header is the Memento-Datetime header is present', function () { return __awaiter(_this, void 0, void 0, function () {
            var date, response, versionURL, versioningHandler;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        date = new Date(2018, 8, 28, 10, 30);
                        fetchMock.get('http://example.org', {
                            status: 200,
                            headers: {
                                'memento-datetime': date,
                                'link': '<http://example.org/earlierVersion>; rel="timegate"'
                            }
                        });
                        return [4 /*yield*/, fetch('http://example.org')];
                    case 1:
                        response = _a.sent();
                        versionURL = '';
                        versioningHandler = new VersioningHandler_1.VersioningHandler({
                            versionCallback: function (versionData) {
                                versionData.stream.on('data', function (data) {
                                    versionURL = data;
                                });
                            },
                            datetime: date,
                            followLink: false,
                            apiClient: client
                        });
                        versioningHandler.onFetch(response);
                        //Wait for stream in callback to stop
                        expect(versionURL).toBe('http://example.org/earlierVersion');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should extract the versioned URL from the Link header if present and no Memento-Datetime header is present', function () { return __awaiter(_this, void 0, void 0, function () {
            var response, versionURL, date, versioningHandler;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fetchMock.get('http://example.org', {
                            status: 200,
                            headers: {
                                'link': '<http://example.org/earlierVersion>; rel="alternate"'
                            }
                        });
                        return [4 /*yield*/, fetch('http://example.org')];
                    case 1:
                        response = _a.sent();
                        versionURL = '';
                        date = new Date(2018, 8, 28, 10, 30);
                        versioningHandler = new VersioningHandler_1.VersioningHandler({
                            versionCallback: function (versionData) {
                                versionData.stream.on('data', function (data) {
                                    versionURL = data;
                                });
                            },
                            datetime: date,
                            followLink: false,
                            apiClient: client
                        });
                        versioningHandler.onFetch(response);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw an error if no Memento-Datetime and Link header are present', function () { return __awaiter(_this, void 0, void 0, function () {
            var response, versionURL, date, versioningHandler;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fetchMock.get('http://example.org', {
                            status: 200
                        });
                        return [4 /*yield*/, fetch('http://example.org')];
                    case 1:
                        response = _a.sent();
                        versionURL = '';
                        date = new Date(2018, 8, 28, 10, 30);
                        versioningHandler = new VersioningHandler_1.VersioningHandler({
                            versionCallback: function (versionData) { },
                            datetime: date,
                            followLink: false,
                            apiClient: client
                        });
                        versioningHandler.onFetch(response);
                        expect(function () { return versioningHandler; }).toThrow();
                        return [2 /*return*/];
                }
            });
        }); });
        //TODO : test onQuad --> stream
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
        it('should throw an error if no arguments were given', function () {
            expect(function () { FullTextSearchHandler_1.FullTextSearchHandler({}); }).toThrow();
        });
        //TODO: onQuad --> stream
    });
    describe('The CRUDHandler module', function () {
        var client;
        var stream;
        var parser;
        beforeEach(function () {
            client = new ApiClient_1.ApiClient({});
            parser = formats.parsers.find('application/ld+json');
            fetchMock.restore();
        });
        afterEach(function () {
            if (stream) {
                stream.unshift(null);
            }
        });
        it('should be a CRUDHandler constructor', function () {
            expect(new CRUDHandler_1.CRUDHandler({ crudCallback: function (crudData) { } })).toBeInstanceOf(CRUDHandler_1.CRUDHandler);
        });
        it('should throw an error if no arguments were given', function () {
            expect(function () { CRUDHandler_1.CRUDHandler({}); }).toThrow();
        });
        it('should extract the possible operations from the Allow header if present', function () { return __awaiter(_this, void 0, void 0, function () {
            var response, operations, crud, expected;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fetchMock.get('http://example.org', {
                            status: 200,
                            headers: {
                                'allow': 'GET,POST'
                            }
                        });
                        return [4 /*yield*/, fetch('http://example.org')];
                    case 1:
                        response = _a.sent();
                        operations = [];
                        crud = new CRUDHandler_1.CRUDHandler({
                            crudCallback: function (data) { return operations = data; }
                        });
                        crud.onFetch(response);
                        crud.onEnd();
                        expected = [{ method: 'GET' }, { method: 'POST' }];
                        expect(operations).toEqual(expected);
                        return [2 /*return*/];
                }
            });
        }); });
        //Error: Unhandled "error' event. TypeError: Cannot read property 'termType' of undefined
        it('should return the possible CRUD operations if found', function () { return __awaiter(_this, void 0, void 0, function () {
            var doc, result, crud, expected;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        doc = {
                            "@context": [
                                "http://www.w3.org/ns/hydra/context.jsonld",
                                {
                                    "sh": "http://www.w3.org/ns/shacl#",
                                    "schema": "https://schema.org/"
                                }
                            ],
                            "@id": "/api/crud/1",
                            "title": "Een voorbeeld resource",
                            "description": "Deze resource kan verwijderd worden met een HTTP DELETE request of aangepast worden met een HTTP PUT request",
                            "operation": [
                                {
                                    "@type": "Operation",
                                    "method": "GET"
                                },
                                {
                                    "@type": "Operation",
                                    "method": "PUT",
                                    "expects": "schema:Event"
                                },
                                {
                                    "@type": "Operation",
                                    "method": "POST",
                                    "expects": "schema:Event"
                                }
                            ]
                        };
                        result = {};
                        crud = new CRUDHandler_1.CRUDHandler({
                            crudCallback: function (operations) { return result = operations; }
                        });
                        stream = new parser.Impl(stringToStream(JSON.stringify(doc)), { baseIRI: 'http://example.org' });
                        stream.on('data', function (quad) {
                            crud.onQuad(quad);
                        });
                        return [4 /*yield*/, new Promise((function (resolve) { return stream.on('end', resolve); }))];
                    case 1:
                        _a.sent();
                        crud.onEnd();
                        expected = [
                            { method: 'GET' },
                            { expects: 'https://schema.org/Event', method: 'PUT' },
                            { expects: 'https://schema.org/Event', method: 'POST' }
                        ];
                        expect(result).toEqual(expected);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
