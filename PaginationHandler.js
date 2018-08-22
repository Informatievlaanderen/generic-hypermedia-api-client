"use strict";
exports.__esModule = true;
var RdfTerm = require("rdf-string");
var linkParser = require('parse-link-header');
var data_model_1 = require("@rdfjs/data-model");
var PaginationHandler = /** @class */ (function () {
    function PaginationHandler(args) {
        var _this = this;
        this.unidentifiedQuads = {};
        this.subjectPageData = {};
        this.FIRST = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#first');
        this.NEXT = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#next');
        this.PREVIOUS = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#previous');
        this.LAST = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#last');
        this.pagedataFields = ['first', 'next', 'last', 'prev'];
        this.pagedataCallback = args.pagedataCallback;
        this.subjectURLs = [];
        args.subjectStream.on('data', function (object) {
            if (object['url']) {
                _this.subjectURLs.push(object['url']);
            }
            else if (object['apiDoc']) {
                _this.subjectURLs.unshift(object['apiDoc']);
            }
        });
    }
    PaginationHandler.prototype.onFetch = function (response) {
        var _this = this;
        if (response.headers.has('link')) {
            var result_1 = linkParser(response.headers.get('link'));
            var priority_1 = this.subjectURLs.indexOf(response.url);
            if (priority_1 >= 0) {
                Object.keys(result_1).forEach(function (key) {
                    _this.subjectPageData[key] = { objectValue: result_1[key]['url'], priority: priority_1 };
                });
            }
        }
    };
    PaginationHandler.prototype.onQuad = function (quad) {
        var _this = this;
        var urlMatched = false;
        var _loop_1 = function (index) {
            var subjectURL = this_1.subjectURLs[index];
            if (RdfTerm.termToString(quad.subject) === subjectURL) {
                urlMatched = true;
                //Process the quad and add its info to the subjectPageData
                this_1.checkPredicates(quad, function (data) {
                    if (Object.keys(data).length > 0) {
                        var key = Object.keys(data)[0];
                        var pageDataPart = _this.subjectPageData[key];
                        if (!pageDataPart || pageDataPart['priority'] > parseInt(index) + 1) {
                            _this.subjectPageData[key] = { value: data[key], priority: parseInt(index) + 1 };
                        }
                    }
                });
            }
            var _loop_2 = function (subjectValue) {
                //If there's already data for the URL, move it to the subjectPageData
                if (subjectValue === subjectURL) {
                    var data_1 = this_1.unidentifiedQuads[subjectValue];
                    Object.keys(data_1).forEach(function (key) {
                        if (!_this.subjectPageData[key]) {
                            _this.subjectPageData[key] = {};
                        }
                        if (_this.subjectPageData[key]['priority'] > parseInt(index) + 1) {
                            _this.subjectPageData[key] = { value: data_1[key], priority: parseInt(index) + 1 };
                        }
                    });
                    delete this_1.unidentifiedQuads[subjectValue];
                }
            };
            for (var subjectValue in this_1.unidentifiedQuads) {
                _loop_2(subjectValue);
            }
        };
        var this_1 = this;
        for (var index in this.subjectURLs) {
            _loop_1(index);
        }
        //The URL has not been discovered (yet)
        if (!urlMatched) {
            this.checkPredicates(quad, function (pagedata) {
                Object.keys(pagedata).forEach(function (key) {
                    if (!_this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]) {
                        _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = {};
                    }
                    _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)][key] = pagedata[key];
                });
            });
        }
    };
    PaginationHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var match = {};
        if (quad.predicate.equals(this.FIRST)) {
            match["first"] = quad.object.value;
        }
        if (quad.predicate.equals(this.NEXT)) {
            match["next"] = quad.object.value;
        }
        if (quad.predicate.equals(this.PREVIOUS)) {
            match["prev"] = quad.object.value;
        }
        if (quad.predicate.equals(this.LAST)) {
            match["last"] = quad.object.value;
        }
        dataCallback(match);
    };
    PaginationHandler.prototype.onEnd = function () {
        var pagedataObject = {};
        for (var index in this.pagedataFields) {
            var pagedataField = this.pagedataFields[index];
            if (!this.subjectPageData[pagedataField]) {
                pagedataObject[pagedataField] = null;
            }
            else {
                pagedataObject[pagedataField] = this.subjectPageData[pagedataField]['value'];
            }
        }
        this.pagedataCallback(pagedataObject);
    };
    return PaginationHandler;
}());
exports.PaginationHandler = PaginationHandler;
