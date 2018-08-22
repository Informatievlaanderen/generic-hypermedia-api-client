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
        this.subjectStream = new stream.Readable({ objectMode: true });
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
        var headers = new Headers();
        handlers.filter(function (handler) {
            if (handler.constructor.name === 'LanguageHandler') {
                var object = handler;
                headers.append('Accept-Language', object.acceptLanguageHeader);
            }
            else if (handler.constructor.name === 'VersioningHandler') {
                var object = handler;
                if (object.datetime) {
                    headers.append('Accept-Datetime', object.datetime);
                }
            }
        });
        //Fetch URL given as parameter
        this.fetcher(url, { headers: headers }).then(function (response) {
            try {
                //The startURL also need to be in the stream
                //This only has to be done 1 time, at the beginning
                if (!_this.startURLAdded) {
                    _this.subjectStream.unshift({ url: response.url });
                    _this.startURLAdded = true;
                }
                //Each handler has to execute his onFetch() method
                for (var i = 0; i < handlers.length; i++) {
                    handlers[i].onFetch(response);
                }
                try {
                    var contentType = contentTypeParser.parse(response.headers.get('content-type')).type;
                    var parser = formats.parsers.find(contentType);
                    var stream_1 = null;
                    if (parser) {
                        stream_1 = new parser.Impl(response.body, { baseIRI: response.url });
                        stream_1.on('data', function (quad) {
                            //If there's a void:subset, we need to add the new URL to the stream and also check its content
                            if (quad.predicate.value === 'http://rdfs.org/ns/void#subset') {
                                _this.subjectStream.unshift({ url: quad.subject.value });
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
                    else {
                        //FullTextSearchHandler
                        //If the content-type is JSON , use FILTER parameter and queryValue in constructor to fetch new URL
                        //If content-type is no RDF or JSON, check if instance has queryKey and queryValue and fetch URL with this parameters
                        handlers.filter(function (handler) {
                            if (handler.constructor.name === 'FullTextSearchHandler') {
                                //HAS NOT BEEN TESTED
                                /*let object = handler as FullTextSearchHandler;
                                let querystring = '';
                                if(contentType.toLocaleLowerCase() === 'json'){
                                    if(object.queryValues.length > 1){
                                        if(object.queryKeys.length === object.queryValues.length){
                                            for(let index in object.queryValues){
                                                querystring += 'filter[' + object.queryKeys[index] + ']=' + object.queryValues[index] + '&';
                                            }
                                        } else {
                                            throw new Error('(FullTextSearchHandler): there are not as many keys as values');
                                        }
                                    } else {
                                        querystring += 'filter=' + object.queryValues[0];
                                    }
                                } else {
                                    if(object.queryValues.length !== object.queryValues.length){
                                        throw new Error('(FullTextSearchHandler): there are not as many keys as values');
                                    } else {
                                        for(let index in object.queryValues){
                                            querystring += object.queryKeys[index] + '=' + object.queryValues[index] + '&';
                                        }
                                    }
                                }

                                if(querystring.substr(querystring.length-1, 1) === '&'){
                                    querystring = querystring.substr(0, querystring.length-1);
                                }

                                querystring = '?' + querystring;*/
                            }
                            else if (handler.constructor.name === 'VersioningHandler') {
                                //If the body is HTML or some type that can't be parsed, we have to stream the body to the client
                                stream_1.unshift(response.body);
                            }
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
