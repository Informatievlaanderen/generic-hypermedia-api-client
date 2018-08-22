"use strict";
exports.__esModule = true;
var stream_1 = require("stream");
var data_model_1 = require("@rdfjs/data-model");
var RdfTerm = require("rdf-string");
var parseLink = require('parse-link-header');
var VersioningHandler = /** @class */ (function () {
    function VersioningHandler(args) {
        this.DATETIME = data_model_1.namedNode('http://www.w3.org/ns/prov#generatedAtTime');
        this.VERSION = data_model_1.namedNode('http://semweb.datasciencelab.be/ns/version/#relatedVersion');
        this.myQuads = {}; //Key will be graph ID
        this.versionCallback = args.versionCallback;
        this.versionCallback = args.versionCallback;
        this.apiClient = args.apiClient;
        this.datetime = args.datetime;
        this.followLink = args.followLink;
        this.versionFound = false;
        this.stream = new stream_1.Readable({ objectMode: true });
        this.stream._read = function () { };
        this.versionCallback({ stream: this.stream });
    }
    VersioningHandler.prototype.onFetch = function (response) {
        //If there's a memento datetime, the Link header will contain an URL with rel='timegate'
        if (response.headers.has('memento-datetime')) {
            var datetime = response.headers.get('memento-datetime');
            var links = response.headers.has('link') && parseLink(response.headers.get('link'));
            if (links && links.timegate) {
                this.versionURL = links.timegate.url;
            }
        }
        else if (response.headers.has('link')) {
            //There's no memento-datetime, Link header could contain an URL with rel='alternate'
            var links = parseLink(response.headers.get('link'));
            if (links && links.alternate) {
                this.versionURL = links.alternate.url;
            }
        }
        else {
            console.log('(VersioningHandler) : no versioning for this URL');
            //throw new Error('(VersioningHandler) : no versioning for this URL');
        }
        if (this.versionURL) {
            if (this.followLink) {
                this.apiClient.fetch(this.versionURL, [this]);
            }
            else {
                this.stream.unshift(this.versionURL);
            }
        }
    };
    VersioningHandler.prototype.onQuad = function (quad) {
        var _this = this;
        //The quad with predicate prov:generatedAtTime or ver:relatedVersion has not been found yet, so store all triples in temporary object
        if (!this.versionFound) {
            this.checkPredicates(quad, function (data) {
                if (Object.keys(data).length > 0) {
                    if (!_this.myQuads[RdfTerm.termToString(quad.graph)]) {
                        _this.myQuads[RdfTerm.termToString(quad.graph)] = [];
                    }
                    _this.myQuads[RdfTerm.termToString(quad.graph)].push(data);
                }
            });
        }
        else {
            //The quad has been found and the graphID is kwown. So start streaming the triples.
            if (this.myQuads[this.graphID].length > 0) {
                for (var index in this.myQuads[this.graphID]) {
                    var triple = this.myQuads[this.graphID][index];
                    this.stream.unshift(triple);
                }
                delete this.myQuads[this.graphID];
            }
            this.checkPredicates(quad, function (data) {
                if (Object.keys(data).length > 0) {
                    _this.stream.unshift(data);
                }
            });
        }
    };
    VersioningHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var triple = {};
        if (!this.versionFound) {
            if (quad.predicate.equals(this.DATETIME) || quad.predicate.equals(this.VERSION)) {
                this.graphID = RdfTerm.termToString(quad.subject);
                this.versionFound = true;
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
