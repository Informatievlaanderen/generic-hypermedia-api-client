"use strict";
exports.__esModule = true;
var linkParser = require('parse-link-header');
var PaginationHandler = /** @class */ (function () {
    function PaginationHandler(args) {
        var _this = this;
        this.myTriples = {};
        this.subjectPageData = {};
        this.FIRST = 'http://www.w3.org/ns/hydra/core#first';
        this.NEXT = 'http://www.w3.org/ns/hydra/core#next';
        this.PREVIOUS = 'http://www.w3.org/ns/hydra/core#previous';
        this.LAST = 'http://www.w3.org/ns/hydra/core#last';
        this.pagedataFields = ['first', 'next', 'last', 'prev'];
        this.pagedataCallback = args.pagedataCallback;
        this.subjectURLs = [];
        args.subjectStream.on('data', function (url) {
            _this.subjectURLs.push(url);
        });
    }
    PaginationHandler.prototype.onFetch = function (response) {
        var _this = this;
        if (response.headers.has('link')) {
            var result_1 = linkParser(response.headers.get('link'));
            Object.keys(result_1).forEach(function (key) {
                _this.subjectPageData[key] = { objectValue: result_1[key]['url'], priority: 0 };
            });
        }
        /*if(response.headers.get('link') !== null){
            let links = response.headers.get('link').split(',');
            for(let i = 0 ; i < links.length ; i++){
                let pieces = links[i].split(';');
                if(pieces[1].indexOf('prev') >= 0){
                    this.subjectPageData['previous'] = {objectValue: pieces[0], priority: 0};
                } else if(pieces[1].indexOf('first') >= 0){
                    this.subjectPageData['first'] = {objectValue: pieces[0], priority: 0};
                } else if(pieces[1].indexOf('last') >= 0){
                    this.subjectPageData['last'] = {objectValue: pieces[0], priority: 0};
                } else if(pieces[1].indexOf('next') >= 0){
                    this.subjectPageData['next'] = {objectValue: pieces[0], priority: 0};
                }
            }
        }*/
    };
    PaginationHandler.prototype.onQuad = function (quad) {
        var _this = this;
        var urlMatched = false;
        var _loop_1 = function (index) {
            var subjectURL = this_1.subjectURLs[index];
            if (quad.subject.value === subjectURL) {
                urlMatched = true;
                //Process the quad and add its info to the subjectPageData
                this_1.checkPredicates(quad, function (pagedata) {
                    Object.keys(pagedata).forEach(function (key) {
                        var pageDataPart = _this.subjectPageData[key];
                        if (!pageDataPart || pageDataPart["priority"] > index) {
                            _this.subjectPageData[key] = { objectValue: pagedata[key], priority: index };
                        }
                    });
                });
            }
            var _loop_2 = function (subjectValue) {
                //If there's already data for the URL, move it to the subjectPageData
                if (subjectValue === subjectURL) {
                    var data_1 = this_1.myTriples[subjectValue];
                    Object.keys(data_1).forEach(function (key) {
                        _this.subjectPageData[key] = { objectValue: data_1[key], priority: index };
                    });
                    delete this_1.myTriples[subjectValue];
                }
            };
            for (var subjectValue in this_1.myTriples) {
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
                    if (!_this.myTriples[quad.subject.value]) {
                        _this.myTriples[quad.subject.value] = {};
                    }
                    _this.myTriples[quad.subject.value][key] = pagedata[key];
                });
            });
        }
    };
    PaginationHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var match = {};
        if (quad.predicate.value === this.FIRST) {
            match["first"] = quad.object.value;
        }
        if (quad.predicate.value === this.NEXT) {
            match["next"] = quad.object.value;
        }
        if (quad.predicate.value === this.PREVIOUS) {
            match["prev"] = quad.object.value;
        }
        if (quad.predicate.value === this.LAST) {
            match["last"] = quad.object.value;
        }
        dataCallback(match);
    };
    PaginationHandler.prototype.onEnd = function () {
        var pagedataObject = {};
        for (var index in this.pagedataFields) {
            if (this.subjectPageData[this.pagedataFields[index]] === undefined) {
                pagedataObject[this.pagedataFields[index]] = null;
            }
            else {
                pagedataObject[this.pagedataFields[index]] = this.subjectPageData[this.pagedataFields[index]]['objectValue'];
            }
        }
        this.pagedataCallback(pagedataObject);
    };
    return PaginationHandler;
}());
exports.PaginationHandler = PaginationHandler;
