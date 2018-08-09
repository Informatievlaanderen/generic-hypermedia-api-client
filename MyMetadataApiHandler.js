"use strict";
exports.__esModule = true;
var MyMetadataApiHandler = /** @class */ (function () {
    function MyMetadataApiHandler(args) {
        var _this = this;
        this.myTriples = {};
        this.subjectMetadata = {};
        this.metadataFields = ['apiDocumentation', 'apiTitle', 'apiContactName', 'apiContactEmail', 'apiContactPhoneNumber', 'temporal', 'spatial'];
        this.metadataCallback = args.metadataCallback;
        this.apiClient = args.apiClient;
        this.followDocLink = args.followDocumentationLink;
        this.subjectURLs = [];
        //Listener for subjectstream from client.
        //Every time a new url is added to the stream, the fetch method from the client with this new url is executed.
        args.subjectStream.on('data', function (url) {
            _this.subjectURLs.push(url);
        });
    }
    MyMetadataApiHandler.prototype.onFetch = function (response) {
        //Check the header, and check its API documentation link.
        if (response.headers.get('link') != null) {
            var link = response.headers.get('link').split(';')[0];
            this.apiDocumentation = link.substr(1, link.length - 2);
        }
    };
    MyMetadataApiHandler.prototype.onQuad = function (quad) {
        var _this = this;
        var urlMatched = false;
        var _loop_1 = function (index) {
            var subjectURL = this_1.subjectURLs[index];
            if (quad.subject.value === subjectURL) {
                urlMatched = true;
                var _loop_2 = function (subjectValue) {
                    if (subjectURL === subjectValue) {
                        //Move metadata part from myTriples to subject_metadata
                        var data_1 = this_1.myTriples[subjectValue];
                        Object.keys(data_1).forEach(function (key) {
                            _this.subjectMetadata[key] = { objectValue: data_1[key], priority: index };
                        });
                        delete this_1.myTriples[subjectValue];
                    }
                };
                // Check if there's already data for this URL in myTriples
                for (var subjectValue in this_1.myTriples) {
                    _loop_2(subjectValue);
                }
                // Process the quad and if there is a match, add it to the SUBJECT_METADATA
                this_1.checkPredicates(quad, function (metadata) {
                    Object.keys(metadata).forEach(function (key) {
                        var metadataPart = _this.subjectMetadata[key];
                        //Only add to subject_metadata is this part of data is new or has a lower (thus more important) priority
                        if (!metadataPart || metadataPart["priority"] > index) {
                            if (key === 'apiDocumentation') {
                                _this.subjectMetadata[key] = { objectValue: metadata[key], priority: 0 };
                            }
                            else {
                                _this.subjectMetadata[key] = { objectValue: metadata[key], priority: index + 1 };
                            }
                        }
                    });
                });
            }
        };
        var this_1 = this;
        for (var index in this.subjectURLs) {
            _loop_1(index);
        }
        //Process quad and put matches in myTriples
        if (!urlMatched) {
            this.checkPredicates(quad, function (metadata) {
                Object.keys(metadata).forEach(function (key) {
                    if (!_this.myTriples[quad.subject.value]) {
                        _this.myTriples[quad.subject.value] = {};
                    }
                    _this.myTriples[quad.subject.value][key] = metadata[key];
                });
            });
        }
    };
    MyMetadataApiHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var match = {};
        if (quad.predicate.value === 'http://www.w3.org/ns/hydra/core#apiDocumentation') {
            match["apiDocumentation"] = quad.object.value;
            if (this.followDocLink) {
                this.apiClient.fetch(quad.object.value, [this]);
                this.apiClient.subjectStream.unshift(quad.object.value);
                this.followDocLink = false;
            }
        }
        if (quad.predicate.value === 'http://purl.org/dc/terms/title') {
            match["apiTitle"] = quad.object.value;
        }
        if (quad.predicate.value === 'http://xlmns.com/foaf/0.1/name') {
            match["apiContactName"] = quad.object.value;
        }
        if (quad.predicate.value === 'http://schema.org/email') {
            match["apiContactEmail"] = quad.object.value;
        }
        if (quad.predicate.value === 'http://schema.org/telephone') {
            match["apiContactPhoneNumber"] = quad.object.value;
        }
        if (quad.predicate.value === 'http://purl.org/dc/terms/temporal') {
            match["temporal"] = quad.object.value;
        }
        if (quad.predicate.value === 'http://purl.org/dc/terms/spatial') {
            match["spatial"] = quad.object.value;
        }
        dataCallback(match);
    };
    // TODO: this metadatacallback is for emitting _all_ metadata at once,
    // but if we want, we could have separate callbacks for each metadata type,
    // then we could potentially invoke the callback much sooner.
    MyMetadataApiHandler.prototype.onEnd = function () {
        //Emit all discovered metadata in the callback
        var metadataObject = {};
        for (var index in this.metadataFields) {
            if (this.subjectMetadata[this.metadataFields[index]] == undefined) {
                metadataObject[this.metadataFields[index]] = null;
            }
            else {
                metadataObject[this.metadataFields[index]] = this.subjectMetadata[this.metadataFields[index]]['objectValue'];
            }
        }
        this.metadataCallback(metadataObject);
    };
    return MyMetadataApiHandler;
}());
exports.MyMetadataApiHandler = MyMetadataApiHandler;
