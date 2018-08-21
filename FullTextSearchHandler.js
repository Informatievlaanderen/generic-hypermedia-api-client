"use strict";
exports.__esModule = true;
var stream_1 = require("stream");
var data_model_1 = require("@rdfjs/data-model");
var FullTextSearchHandler = /** @class */ (function () {
    function FullTextSearchHandler(args) {
        this.callback = args.callback;
        this.querystring = args.querystring;
        this.stream = new stream_1.Readable({ objectMode: true });
        this.stream._read = function () { };
        this.callback({ stream: this.stream });
    }
    FullTextSearchHandler.prototype.onFetch = function (response) {
        //If there's an error, stop the stream.
        if (response.status === 400 || response.status === 404) {
            this.stream.unshift(null);
        }
    };
    FullTextSearchHandler.prototype.onQuad = function (quad) {
        var _this = this;
        //So if the client did not give a querystring in the constructor, we have to search in the body
        //for the Hydra query template
        if (!this.querystring) {
            this.checkPredicates(quad, function (data) {
                if (data) {
                    _this.stream.unshift(data);
                }
            });
        }
    };
    FullTextSearchHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var template = '';
        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_QUERY_TEMPLATE)) {
            template = quad.object.value;
        }
        dataCallback(template);
    };
    FullTextSearchHandler.prototype.onEnd = function () {
        this.stream.unshift(null);
    };
    FullTextSearchHandler.HYDRA_QUERY_TEMPLATE = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#template');
    return FullTextSearchHandler;
}());
exports.FullTextSearchHandler = FullTextSearchHandler;
