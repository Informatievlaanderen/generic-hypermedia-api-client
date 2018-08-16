"use strict";
exports.__esModule = true;
var stream_1 = require("stream");
var parseLink = require('parse-link-header');
var VersioningHandler = /** @class */ (function () {
    function VersioningHandler(args) {
        this.myQuads = {}; //Key will be graph ID
        this.versionCallback = args.versionCallback;
        if (args.datetime && args.version) {
            throw new Error('This building block requires either a datetime or a version identification, not both');
        }
        //If a datetime is given as parameter, it means TEMPORAL versioning. If a version ID is given, it means ATEMPORAL versioning.
        if (args.datetime || args.version) {
            if (args.datetime) {
                this.datetime = args.datetime;
            }
            else if (args.version) {
                this.version = args.version;
            }
        }
        this.versionFound = false;
        this.stream = new stream_1.Readable({ objectMode: true });
        this.stream._read = function () { };
        this.versionCallback({ stream: this.stream });
    }
    VersioningHandler.prototype.onFetch = function (response) {
        //We asked for a time-negotiated response, but didn't receive one.
        if (this.datetime && response.headers && !response.headers.has('memento-datetime')) {
            //Maybe the link header has some value
            var links = response.headers.has('link') && parseLink(response.headers.get('link'));
            if (links) {
                var rel = Object.keys(links)[0];
                var link = links[rel].url;
                this.stream.unshift({ 'versionLink': link });
            }
        }
        else {
            //TODO : what if there's a memento datetime?
        }
    };
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
            if (this.datetime && quad.predicate.value == 'http://www.w3.org/ns/prov#generatedAtTime') {
                this.graphID = quad.subject.value;
                this.versionFound = true;
            }
            else if (this.version && quad.predicate.value == 'http://semweb.datasciencelab.be/ns/version/#relatedVersion') {
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
