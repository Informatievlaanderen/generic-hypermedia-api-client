"use strict";
exports.__esModule = true;
var MyMetadataApiHandler_1 = require("./MyMetadataApiHandler");
var PaginationHandler_1 = require("./PaginationHandler");
require('es6-promise').polyfill();
require('isomorphic-fetch');
var RDF = require('rdf-ext');
var formats = require('rdf-formats-common')(RDF);
var stream = require('stream');
/**
 * An API Client is used to discover capabilities of a certain API.
 * It has an internal fetch method and RDF parser.
 */
var ApiClient = /** @class */ (function () {
    function ApiClient(args) {
        if (args != null) {
            this.fetcher = args.fetch != null ? args.fetch : fetch;
            this.parser = args.rdfParser != null ? args.rdfParser : null;
        }
        else {
            this.fetcher = fetch;
            this.parser = null;
        }
        this.subjectStream = new stream.Readable();
        this.subjectStream._read = function () { };
        this.startURLAdded = false;
    }
    /**
     * Fetch the given URL and invoke the given handlers on the response.
     * @param {string} url The URL to fetch.
     * @param {IApiHandler[]} handlers An array of handlers to invoke on the response.
     */
    ApiClient.prototype.fetch = function (url, handlers) {
        var _this = this;
        this.fetcher(url).then(function (response) {
            for (var i = 0; i < handlers.length; i++) {
                handlers[i].onFetch(response);
            }
            if (!_this.startURLAdded) {
                _this.subjectStream.unshift(response.url);
                _this.startURLAdded = true;
            }
            var contentType = response.headers.get('content-type').split(';')[0];
            var parser = formats.parsers.find(contentType);
            var stream = new parser.Impl(response.body);
            stream.on('data', function (quad) {
                if (quad.predicate.value === 'http://rdfs.org/ns/void#subset') {
                    _this.subjectStream.unshift(quad.subject.value);
                    _this.fetch(quad.subject.value, handlers);
                }
                else {
                    for (var i = 0; i < handlers.length; i++) {
                        handlers[i].onQuad(quad);
                    }
                }
            });
            stream.on('end', function () {
                for (var i = 0; i < handlers.length; i++) {
                    handlers[i].onEnd();
                }
            });
            stream.on('error', function (error) {
                console.error('ERROR: ' + error);
            });
        });
    };
    return ApiClient;
}());
exports.ApiClient = ApiClient;
//TEST PROGRAM
//https://datapiloten.be/parking/catalog.ttl
//https://graph.irail.be/sncb/connections
try {
    var client = new ApiClient(null);
    client.fetch("https://graph.irail.be/sncb/connections", [
        new MyMetadataApiHandler_1.MyMetadataApiHandler({ metadataCallback: function (metadata) { return console.log(metadata); },
            apiClient: client,
            followDocumentationLink: true,
            subjectStream: client.subjectStream
        }),
        new PaginationHandler_1.PaginationHandler({ pagedataCallback: function (pages) { return console.log(pages); },
            subjectStream: client.subjectStream
        })
    ]);
}
finally { }
