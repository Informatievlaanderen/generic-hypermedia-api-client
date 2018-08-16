"use strict";
exports.__esModule = true;
var RdfTerm = require("rdf-string");
var data_model_1 = require("@rdfjs/data-model");
var linkParser = require('parse-link-header');
var MyMetadataApiHandler = /** @class */ (function () {
    function MyMetadataApiHandler(args) {
        var _this = this;
        this.unidentifiedQuads = {}; //Contains all quads whose URL (subject) has not been discovered (yet).
        this.subjectMetadata = {}; //Object that contains THE information that will be returned to the client
        //Constants
        this.API_DOCUMENTATION = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#apiDocumentation');
        this.API_TITLE_1 = data_model_1.namedNode('http://purl.org/dc/terms/title');
        this.API_TITLE_2 = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#title');
        this.API_CONTACT_NAME = data_model_1.namedNode('https://schema.org/contactnaam');
        this.API_CONTACT_EMAIL = data_model_1.namedNode('https://schema.org/email');
        this.API_CONTACT_TELEPHONE = data_model_1.namedNode('http://schema.org/telephone');
        this.API_TEMPORAL = data_model_1.namedNode('http://purl.org/dc/terms/temporal');
        this.API_SPATIAL = data_model_1.namedNode('http://purl.org/dc/terms/spatial');
        this.API_CONTACT_POINT = data_model_1.namedNode('https://schema.org/contactPoint');
        this.myQuads = [];
        this.metadataFields = ['apiDocumentation', 'apiTitle', 'apiContactName', 'apiContactEmail', 'apiContactTelephone', 'temporal', 'spatial'];
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
        if (response.headers.has('link')) {
            if (!this.subjectMetadata['apiDocumentation']) {
                this.subjectMetadata['apiDocumentation'] = {};
            }
            var object = linkParser(response.headers.get('link'));
            var rel = Object.keys(object)[0];
            var link = object[rel].url;
            this.subjectMetadata['apiDocumentation'] = { objectValue: link, priority: 0 };
            if (this.followDocLink) {
                this.apiClient.fetch(this.subjectMetadata['apiDocumentation'].objectValue, [this]);
                this.apiClient.subjectStream.unshift(this.subjectMetadata['apiDocumentation'].objectValue);
            }
        }
        this.baseIRI = response.url;
    };
    MyMetadataApiHandler.prototype.onQuad = function (quad) {
        var _this = this;
        var urlMatched = false;
        var _loop_1 = function (index) {
            var subjectURL = this_1.subjectURLs[index];
            if (RdfTerm.termToString(quad.subject) === subjectURL) {
                urlMatched = true;
                var _loop_2 = function (subjectValue) {
                    if (subjectURL === subjectValue) {
                        //Move metadata part from unidentifiedQuads to subject_metadata
                        var data_1 = this_1.unidentifiedQuads[subjectValue];
                        Object.keys(data_1).forEach(function (key) {
                            _this.subjectMetadata[key] = { objectValue: data_1[key], priority: index };
                        });
                        delete this_1.unidentifiedQuads[subjectValue];
                    }
                };
                // Check if there's already data for this URL in myTriples
                for (var subjectValue in this_1.unidentifiedQuads) {
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
                                _this.subjectMetadata[key] = { objectValue: RdfTerm.termToString(metadata[key].object), priority: parseInt(index) + 1 };
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
        //Process quad and put matches in unidentifiedQuads
        if (!urlMatched) {
            this.checkPredicates(quad, function (metadata) {
                Object.keys(metadata).forEach(function (key) {
                    if (!_this.unidentifiedQuads[RdfTerm.termToString(metadata[key].subject)]) {
                        _this.unidentifiedQuads[RdfTerm.termToString(metadata[key].subject)] = {};
                    }
                    _this.unidentifiedQuads[RdfTerm.termToString(metadata[key].subject)][key] = RdfTerm.termToString(metadata[key].object);
                });
            });
        }
    };
    MyMetadataApiHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var _this = this;
        var match = {};
        if (quad.predicate.equals(this.API_DOCUMENTATION)) {
            match['apiDocumentation'] = this.baseIRI + quad.object.value;
            if (this.followDocLink) {
                this.apiClient.fetch(match['apiDocumentation'], [this]);
                this.apiClient.subjectStream.unshift(match['apiDocumentation']);
                this.followDocLink = false;
            }
        }
        if (quad.predicate.equals(this.API_TITLE_1) || quad.predicate.equals(this.API_TITLE_2)) {
            match['apiTitle'] = quad;
        }
        if (quad.predicate.equals(this.API_CONTACT_POINT)) {
            //Check if there are triples with this quad its object as subject
            //If so, store them with the subject URL of this triple (schema:contactPoint)
            if (this.unidentifiedQuads.hasOwnProperty(RdfTerm.termToString(quad.object))) {
                var values_1 = this.unidentifiedQuads[RdfTerm.termToString(quad.object)];
                Object.keys(values_1).forEach(function (key) {
                    if (!_this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]) {
                        _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = {};
                    }
                    _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)][key] = values_1[key];
                });
            }
            this.myQuads.push(quad);
        }
        //Belongs to schema:contactPoint
        if (quad.predicate.equals(this.API_CONTACT_NAME)) {
            Object.keys(this.myQuads).forEach(function (index) {
                if (_this.myQuads[index].object.equals(quad.subject)) {
                    quad.subject = _this.myQuads[index].subject;
                }
            });
            match['apiContactName'] = quad;
        }
        //Belongs to schema:contactPoint
        if (quad.predicate.equals(this.API_CONTACT_EMAIL)) {
            Object.keys(this.myQuads).forEach(function (index) {
                if (_this.myQuads[index].object.equals(quad.subject)) {
                    quad.subject = _this.myQuads[index].subject;
                }
            });
            match['apiContactEmail'] = quad;
        }
        //Belongs to schema:contactPoint?
        if (quad.predicate.equals(this.API_CONTACT_TELEPHONE)) {
            Object.keys(this.myQuads).forEach(function (index) {
                if (_this.myQuads[index].object.equals(quad.subject)) {
                    quad.subject = _this.myQuads[index].subject;
                }
            });
            match['apiContactTelephone'] = quad;
        }
        if (quad.predicate.equals(this.API_TEMPORAL)) {
            match['temporal'] = quad;
        }
        if (quad.predicate.equals(this.API_SPATIAL)) {
            match['spatial'] = quad;
        }
        dataCallback(match);
    };
    // TODO: this metadatacallback is for emitting _all_ metadata at once,
    // but if we want, we could have separate callbacks for each metadata type,
    // then we could potentially invoke the callback much sooner.
    MyMetadataApiHandler.prototype.onEnd = function () {
        var _this = this;
        var _loop_3 = function (index) {
            if (this_2.unidentifiedQuads.hasOwnProperty(RdfTerm.termToString(this_2.myQuads[index].object))) {
                //There are quads that need to be transferred.
                var values_2 = this_2.unidentifiedQuads[RdfTerm.termToString(this_2.myQuads[index].object)];
                Object.keys(values_2).forEach(function (key) {
                    _this.subjectMetadata[key] = { objectValue: values_2[key], priority: 5 };
                });
            }
        };
        var this_2 = this;
        //We have to check the quads in the unidentified quads because the last quad could has an object.value that is linked to the subject.value
        //of quads stored in that object
        for (var index in this.myQuads) {
            _loop_3(index);
        }
        //Emit all discovered metadata in the callback
        /*let metadataObject = {};
        for(let index in this.metadataFields){
            if(this.subjectMetadata[this.metadataFields[index]] === undefined){
                metadataObject[this.metadataFields[index]] = null;
            } else {
                metadataObject[this.metadataFields[index]] = this.subjectMetadata[this.metadataFields[index]]['objectValue'];
            }
        }
        this.metadataCallback(metadataObject);*/
        console.log(this.subjectMetadata);
    };
    return MyMetadataApiHandler;
}());
exports.MyMetadataApiHandler = MyMetadataApiHandler;
