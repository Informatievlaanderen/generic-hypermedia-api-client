"use strict";
exports.__esModule = true;
var stream_1 = require("stream");
var LanguageHandler = /** @class */ (function () {
    function LanguageHandler(args) {
        this.languageCallback = args.languageCallback;
        this.acceptLanguageHeader = args.acceptLanguageHeader;
        //Create a Readable stream
        try {
            this.quadStream = new stream_1.Readable({ objectMode: true });
            this.quadStream._read = function () { };
            this.languageCallback({ stream: this.quadStream });
            this.streamIsStopped = false;
        }
        catch (e) {
            this.streamIsStopped = true;
            console.log('ERROR (LanguageHandler): ' + e);
        }
    }
    LanguageHandler.prototype.onFetch = function (response) {
        if (response.status === 200) {
            this.acceptedLanguage = response.headers.get('content-language');
            if (this.acceptedLanguage) {
                this.quadStream.unshift(this.acceptedLanguage);
            }
            else {
                this.streamIsStopped = true;
                this.quadStream.unshift(null);
            }
        }
        else {
            this.streamIsStopped = true;
            this.quadStream.unshift(null);
            throw new Error(response.url + " does not support the requested language(s)");
        }
    };
    LanguageHandler.prototype.onQuad = function (quad) {
        //Make sure that only literals in different language are filtered out.
        //IRIs (NamedNodes) and BlankNodes don't have a language, so we always push them in the stream.
        if (!this.streamIsStopped) {
            if (quad.object.termType === 'Literal') {
                if (quad.object.language.toLowerCase() == this.acceptedLanguage.toLowerCase()) {
                    this.quadStream.unshift(quad);
                }
            }
            else {
                this.quadStream.unshift(quad);
            }
        }
    };
    //Not needed
    LanguageHandler.prototype.checkPredicates = function (quad, dataCallback) { };
    LanguageHandler.prototype.onEnd = function () {
        this.quadStream.unshift(null);
    };
    return LanguageHandler;
}());
exports.LanguageHandler = LanguageHandler;
