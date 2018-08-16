"use strict";
exports.__esModule = true;
require('es6-promise').polyfill();
require('isomorphic-fetch');
var RDF = require('rdf-ext');
var formats = require('rdf-formats-common')(RDF);
var stream = require('stream');
var contentTypeParser = require('content-type');
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
        this.subjectStream._read = function () {
        };
        this.startURLAdded = false;
    }
    /**
     * Fetch the given URL and invoke the given handlers on the response.
     * @param {string} url The URL to fetch.
     * @param {IApiHandler[]} handlers An array of handlers to invoke on the response.
     */
    ApiClient.prototype.fetch = function (url, handlers) {
        var _this = this;
        var headers = {};
        handlers.filter(function (handler) {
            if (handler.constructor.name === 'LanguageHandler') {
                headers['Accept-Language'] = handler.acceptLanguageHeader;
            }
            else if (handler.constructor.name === 'VersioningHandler') {
                headers['Accept-Datetime'] = handler.datetime; //NOT SENDING TO SERVER
            }
        });
        //Fetch URL given as parameter
        this.fetcher(url, { headers: headers }).then(function (response) {
            //Each handlers has to execute his onFetch() method
            try {
                for (var i = 0; i < handlers.length; i++) {
                    handlers[i].onFetch(response);
                }
                //The startURL also need to be in the stream
                //This only has to be done 1 time, at the beginning
                if (!_this.startURLAdded) {
                    _this.subjectStream.unshift(response.url);
                    _this.startURLAdded = true;
                }
                try {
                    var contentType = contentTypeParser.parse(response.headers.get('content-type')).type;
                    var parser = formats.parsers.find(contentType);
                    if (parser) {
                        var stream_1 = new parser.Impl(response.body, { baseIRI: response.url });
                        stream_1.on('data', function (quad) {
                            //If there's a void:subset, we need to add the new URL to the stream and also check its content
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
                        stream_1.on('end', function () {
                            for (var i = 0; i < handlers.length; i++) {
                                console.log('Stream is done for [' + handlers[i].constructor.name + ']');
                                handlers[i].onEnd();
                            }
                        });
                        stream_1.on('error', function (error) {
                            stream_1.emit('end');
                            console.error('ERROR (ApiClient): ' + error);
                        });
                    }
                }
                catch (e) {
                    console.error('Error: ' + e.message);
                }
            }
            catch (e) {
                console.error('Error: ' + e.message);
            }
        });
    };
    return ApiClient;
}());
exports.ApiClient = ApiClient;
