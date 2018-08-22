"use strict";
exports.__esModule = true;
var stream_1 = require("stream");
var data_model_1 = require("@rdfjs/data-model");
var RdfTerm = require("rdf-string");
var template = require('url-template');
var FullTextSearchHandler = /** @class */ (function () {
    function FullTextSearchHandler(args) {
        var _this = this;
        this.queryValues = [];
        this.queryKeys = [];
        this.subjectURLs = [];
        this.mappingQuads = [];
        this.searchQuads = [];
        this.unidentifiedQuads = {};
        this.templateKeys = [];
        this.callback = args.callback;
        this.queryValues = args.queryValues;
        this.queryKeys = args.queryKeys;
        this.apiClient = args.apiClient;
        this.apiClient.subjectStream.on('data', function (object) {
            var key = Object.keys(object)[0];
            _this.subjectURLs.push(object[key]);
        });
        this.parameterURLFetched = false;
        this.quadStream = new stream_1.Readable({ objectMode: true });
        this.quadStream._read = function () { };
        this.callback({ stream: this.quadStream });
    }
    FullTextSearchHandler.prototype.onFetch = function (response) {
        //What should we do here?
    };
    FullTextSearchHandler.prototype.onQuad = function (quad) {
        var _this = this;
        if (!this.parameterURLFetched) {
            var urlMatch = false;
            for (var i in this.subjectURLs) {
                var subjectURL = this.subjectURLs[i];
                if (RdfTerm.termToString(quad.subject) === subjectURL) {
                    urlMatch = true;
                    this.checkPredicates(quad, function (data) {
                        if (!_this.templateURL && data['templateURL']) {
                            _this.templateURL = data['templateURL'];
                        }
                        else if (data["templateKey"]) {
                            _this.templateKeys.push(data['templateKey']);
                        }
                    });
                }
                var _loop_1 = function (subjectValue) {
                    if (subjectValue === subjectURL) {
                        var values_1 = this_1.unidentifiedQuads[subjectValue];
                        if (!this_1.templateURL && values_1['templateURL']) {
                            this_1.templateURL = values_1['templateURL'];
                        }
                        else if (values_1['templateKeys']) {
                            Object.keys(values_1['templateKeys']).forEach(function (index) {
                                _this.templateKeys.push(values_1['templateKeys'][index]);
                            });
                        }
                    }
                };
                var this_1 = this;
                for (var subjectValue in this.unidentifiedQuads) {
                    _loop_1(subjectValue);
                }
            }
            if (!urlMatch) {
                this.checkPredicates(quad, function (data) {
                    if (!_this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]) {
                        _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = {};
                    }
                    if (data['templateURL']) {
                        _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]['templateURL'] = data['templateURL'];
                    }
                    else if (data['templateKey']) {
                        if (!_this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]['templateKeys']) {
                            _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]['templateKeys'] = [];
                        }
                        _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]['templateKeys'].push(data['templateKey']);
                    }
                });
            }
            var _loop_2 = function (i) {
                var searchQuad = this_2.searchQuads[i];
                //Check level 1
                if (this_2.subjectURLs.indexOf(RdfTerm.termToString(searchQuad.subject)) >= 0 && this_2.unidentifiedQuads[RdfTerm.termToString(searchQuad.object)]) {
                    var values_2 = this_2.unidentifiedQuads[RdfTerm.termToString(searchQuad.object)];
                    if (values_2['templateURL'] && !this_2.templateURL) {
                        this_2.templateURL = values_2['templateURL'];
                    }
                    else if (values_2['templateKeys']) {
                        Object.keys(values_2['templateKeys']).forEach(function (index) {
                            _this.templateKeys.push(values_2['templateKeys'][index]);
                        });
                    }
                }
                var _loop_3 = function (j) {
                    var mapQuad = this_2.mappingQuads[j];
                    if (mapQuad.subject.equals(searchQuad.object) && this_2.subjectURLs.indexOf(RdfTerm.termToString(searchQuad.subject)) >= 0 && this_2.unidentifiedQuads[RdfTerm.termToString(mapQuad.object)]) {
                        var values_3 = this_2.unidentifiedQuads[RdfTerm.termToString(mapQuad.object)];
                        if (!this_2.templateURL && values_3['templateURL']) {
                            this_2.templateURL = values_3['templateURL'];
                        }
                        else if (values_3['templateKeys']) {
                            Object.keys(values_3['templateKeys']).forEach(function (index) {
                                _this.templateKeys.push(values_3['templateKeys'][index]);
                            });
                        }
                    }
                };
                //Check level 2
                for (var j in this_2.mappingQuads) {
                    _loop_3(j);
                }
            };
            var this_2 = this;
            for (var i in this.searchQuads) {
                _loop_2(i);
            }
        }
        else {
            this.quadStream.unshift(quad);
        }
    };
    FullTextSearchHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var template = {};
        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_QUERY_TEMPLATE)) {
            template['templateURL'] = quad.object.value;
        }
        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_MAPPING)) {
            this.mappingQuads.push(quad);
        }
        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_SEARCH)) {
            this.searchQuads.push(quad);
        }
        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_VARIABLE)) {
            template['templateKey'] = quad.object.value;
        }
        dataCallback(template);
    };
    FullTextSearchHandler.prototype.onEnd = function () {
        var _this = this;
        if (!this.parameterURLFetched) {
            if (this.templateURL && this.templateKeys.length > 0) {
                var parsedURL = template.parse(this.templateURL);
                //The array of values has to have the same length of the array of templateKeys
                var object_1 = {};
                Object.keys(this.templateKeys).forEach(function (index) {
                    object_1[_this.templateKeys[index]] = _this.queryValues[index];
                });
                var queryURL = parsedURL.expand(object_1);
                //FETCH IT
                this.apiClient.fetch(queryURL, [this]);
                this.parameterURLFetched = true;
            }
        }
        else {
            this.quadStream.unshift(null);
        }
    };
    FullTextSearchHandler.HYDRA_QUERY_TEMPLATE = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#template');
    FullTextSearchHandler.HYDRA_MAPPING = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#mapping');
    FullTextSearchHandler.HYDRA_VARIABLE = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#variable');
    FullTextSearchHandler.HYDRA_SEARCH = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#search');
    return FullTextSearchHandler;
}());
exports.FullTextSearchHandler = FullTextSearchHandler;
