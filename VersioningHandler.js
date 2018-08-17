"use strict";
exports.__esModule = true;
var stream_1 = require("stream");
var data_model_1 = require("@rdfjs/data-model");
var parseLink = require('parse-link-header');
var VersioningHandler = /** @class */ (function () {
    function VersioningHandler(args) {
        this.DATETIME = data_model_1.namedNode('http://www.w3.org/ns/prov#generatedAtTime');
        this.VERSION = data_model_1.namedNode('http://semweb.datasciencelab.be/ns/version/#relatedVersion');
        this.myQuads = {}; //Key will be graph ID
        this.versionCallback = args.versionCallback;
        if (!args) {
            throw new Error('Please give a callback and datetime as parameters please');
        }
        if (!args.datetime) {
            throw new Error('This building block requires a datetime');
        }
        else {
            this.datetime = args.datetime;
        }
        this.versionFound = false;
        this.stream = new stream_1.Readable({ objectMode: true });
        this.stream._read = function () { };
        this.versionCallback({ stream: this.stream });
    }
    //TODO!
    VersioningHandler.prototype.onFetch = function (response) {
        //We aksed for a time-negotiated response and received one
        if (this.datetime && response.headers && response.headers.has('memento-datetime')) {
            this.stream.unshift(response.headers.get('memento-datetime'));
        }
        else if (this.version && response.status === 307) {
            console.log("MA YES E");
            //TODO : JUST STREAM IT
        }
        else {
            //We asked for a time-negotiated response or for a specific version, but didn't receive one of them
            //So we throw an error, because the server should do one of both.
            throw new Error('Server must at least respond with a memento-datetime or redirect URL');
        }
    };
    //TODO : check this method
    VersioningHandler.prototype.onQuad = function (quad) {
        var _this = this;
        //The quad with predicate prov:generatedAtTime or ver:relatedVersion has not been found yet, so store all triples in temporary object
        if (!this.versionFound) {
            this.checkPredicates(quad, function (data) {
                if (Object.keys(data).length > 0) {
                    if (!_this.myQuads[quad.graph.value]) {
                        _this.myQuads[quad.graph.value] = [];
                    }
                    _this.myQuads[quad.graph.value].push(data);
                }
            });
        }
        else {
            //The quad has been found and the graphID is kwown. So start streaming the triples.
            this.stream.unshift(this.myQuads[this.graphID]);
        }
    };
    VersioningHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var triple = {};
        if (!this.versionFound) {
            if (this.datetime && quad.predicate.equals(this.DATETIME)) {
                this.graphID = quad.subject.value;
                this.versionFound = true;
            }
            else if (this.version && quad.predicate.equals(this.VERSION)) {
                //TODO
            }
            else {
                triple['subject'] = quad.subject;
                triple['predicate'] = quad.predicate;
                triple['object'] = quad.object;
            }
        }
        else {
            triple['subject'] = quad.subject;
            triple['predicate'] = quad.predicate;
            triple['object'] = quad.object;
        }
        dataCallback(triple);
    };
    VersioningHandler.prototype.onEnd = function () {
        this.stream.unshift(null);
    };
    return VersioningHandler;
}());
exports.VersioningHandler = VersioningHandler;
