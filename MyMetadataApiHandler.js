"use strict";
exports.__esModule = true;
var RdfTerm = require("rdf-string");
var data_model_1 = require("@rdfjs/data-model");
var linkParser = require('parse-link-header');
var MyMetadataApiHandler = /** @class */ (function () {
    function MyMetadataApiHandler(args) {
        var _this = this;
        this.unidentifiedQuads = {}; //Contains all quads whose URL (subject) has not been discovered (yet).
        this.identifiedQuads = {}; //Contains quads whose subject is in subjectURLs and have a predicate that was matched
        this.myQuads = [];
        this.metadataFields = ['apiDocumentation',
            'apiTitle',
            'apiContactName',
            'apiContactEmail',
            'apiContactTelephone',
            'temporal',
            'spatial',
            'geometry',
            'temporalStartDate',
            'temporalEndDate',
            'apiLicense',
            'apiDescription',
            'apiIssued',
            'apiModified'
        ];
        this.metadataCallback = args.metadataCallback;
        this.apiClient = args.apiClient;
        this.followDocLink = args.followDocumentationLink;
        this.subjectURLs = [];
        //Listener for subjectstream from client.
        //Every time a new url is added to the stream, the fetch method from the client with this new url is executed.
        args.subjectStream.on('data', function (object) {
            if (object['url']) {
                _this.subjectURLs.push(object['url']);
            }
            else if (object['apiDoc']) {
                _this.subjectURLs.unshift(object['apiDoc']);
            }
        });
    }
    MyMetadataApiHandler.prototype.onFetch = function (response) {
        //Check the header, and check its API documentation link.
        if (response.headers.has('link')) {
            if (!this.identifiedQuads['apiDocumentation']) {
                this.identifiedQuads['apiDocumentation'] = [];
            }
            var object = linkParser(response.headers.get('link'));
            var link = object[RdfTerm.termToString(MyMetadataApiHandler.API_DOCUMENTATION)].url;
            var priority = this.subjectURLs.indexOf(response.url);
            if (!this.identifiedQuads['apiDocumentation']) {
                this.identifiedQuads['apiDocumentation'] = [];
            }
            if (priority >= 0) {
                this.identifiedQuads['apiDocumentation'].push({ value: link, priority: priority + 1 });
            }
        }
        this.baseIRI = response.url;
    };
    MyMetadataApiHandler.prototype.onQuad = function (quad) {
        var _this = this;
        var urlMatched = false;
        var _loop_1 = function (index) {
            var subjectURL = this_1.subjectURLs[index];
            //The subject of the quad is known, so process this quad and if data, store it in identified quads
            if (RdfTerm.termToString(quad.subject) === subjectURL) {
                urlMatched = true;
                this_1.checkPredicates(quad, function (data) {
                    if (Object.keys(data).length > 0) {
                        var predicateVal = Object.keys(data)[0];
                        if (!_this.identifiedQuads[predicateVal]) {
                            _this.identifiedQuads[predicateVal] = [];
                        }
                        _this.identifiedQuads[predicateVal].push({ value: data[predicateVal], priority: parseInt(index) + 1 }); //TODO: info of api doc has bigger priority
                    }
                });
            }
            //For every URL in subjectURLs we have to check if there are quads in unidentified quads.
            //If so, then move them to identified quads
            for (var subjectVal in this_1.unidentifiedQuads) {
                if (subjectVal === subjectURL) {
                    for (var index_1 in this_1.unidentifiedQuads[subjectVal]) {
                        var object = this_1.unidentifiedQuads[subjectVal][index_1];
                        if (!this_1.identifiedQuads[object['predicate']]) {
                            this_1.identifiedQuads[object['predicate']] = [];
                        }
                        this_1.identifiedQuads[object['predicate']].push({ value: object['value'], priority: parseInt(index_1) + 1 });
                    }
                }
            }
        };
        var this_1 = this;
        for (var index in this.subjectURLs) {
            _loop_1(index);
        }
        if (!urlMatched) {
            this.checkPredicates(quad, function (data) {
                if (Object.keys(data).length > 0) {
                    var predicateVal = Object.keys(data)[0];
                    if (!_this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]) {
                        _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = [];
                    }
                    _this.unidentifiedQuads[RdfTerm.termToString(quad.subject)].push({ predicate: predicateVal, value: data[predicateVal] });
                }
            });
        }
    };
    MyMetadataApiHandler.prototype.checkPredicates = function (quad, dataCallback) {
        var match = {};
        if (quad.predicate.equals(MyMetadataApiHandler.API_DOCUMENTATION)) {
            match['apiDocumentation'] = this.baseIRI + quad.object.value;
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_DESCRIPTION)) {
            match['apiDescription'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_LICENSE)) {
            match['apiLicense'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_ISSUED)) {
            match['apiIssued'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_MODIFIED)) {
            match['apiModified'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_TITLE_1) || quad.predicate.equals(MyMetadataApiHandler.API_TITLE_2)) {
            match['apiTitle'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_CONTACT_POINT) || quad.predicate.equals(MyMetadataApiHandler.API_TEMPORAL) || quad.predicate.equals(MyMetadataApiHandler.API_SPATIAL)) {
            //Check if there are triples with this quad its object as subject
            //If so, store them with the subject URL of this triple (schema:contactPoint)
            this.myQuads.push(quad);
        }
        //Belongs to schema:contactPoint
        if (quad.predicate.equals(MyMetadataApiHandler.API_CONTACT_NAME)) {
            match['apiContactName'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        //Belongs to schema:contactPoint
        if (quad.predicate.equals(MyMetadataApiHandler.API_CONTACT_EMAIL)) {
            match['apiContactEmail'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        //Belongs to schema:contactPoint?
        if (quad.predicate.equals(MyMetadataApiHandler.API_CONTACT_TELEPHONE)) {
            match['apiContactTelephone'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_GEOMETRY)) {
            match['geometry'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_START_DATE)) {
            match['temporalStartDate'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        if (quad.predicate.equals(MyMetadataApiHandler.API_END_DATE)) {
            match['temporalEndDate'] = quad.object.value; //RdfTerm.termToString(quad.object);
        }
        dataCallback(match);
    };
    // TODO: this metadatacallback is for emitting _all_ metadata at once,
    // but if we want, we could have separate callbacks for each metadata type,
    // then we could potentially invoke the callback much sooner.
    MyMetadataApiHandler.prototype.onEnd = function () {
        //We have to check the quads in the unidentified quads because the last quad could have an object.value that is linked to the subject.value
        //of quads stored in the unidentified quads.
        for (var i in this.myQuads) {
            var quad = this.myQuads[i];
            if (this.unidentifiedQuads.hasOwnProperty(RdfTerm.termToString(quad.object))) {
                var priority = this.subjectURLs.indexOf(RdfTerm.termToString(quad.subject));
                if (priority >= 0) {
                    var objects = this.unidentifiedQuads[RdfTerm.termToString(quad.object)];
                    for (var j in objects) {
                        var object = objects[j];
                        if (!this.identifiedQuads[object['predicate']]) {
                            this.identifiedQuads[object['predicate']] = [];
                        }
                        this.identifiedQuads[object['predicate']].push({ value: object['value'], priority: priority + 1 });
                    }
                    delete this.unidentifiedQuads[RdfTerm.termToString(quad.object)];
                }
            }
        }
        var metadataObject = {};
        for (var i in this.metadataFields) {
            var metadata = this.metadataFields[i];
            if (this.identifiedQuads.hasOwnProperty(metadata)) {
                var values = this.identifiedQuads[metadata];
                var valueWithHighestPriority = values[0]['value'];
                var highestPriority = values[0]['priority'];
                for (var j = 1; j < values.length; j++) {
                    if (values[j]['priority'] < highestPriority) {
                        highestPriority = values[j]['priority'];
                        valueWithHighestPriority = values[j]['value'];
                    }
                }
                metadataObject[metadata] = valueWithHighestPriority;
                //delete this.identifiedQuads[metadata];
            }
        }
        if (metadataObject['apiDocumentation']) {
            if (this.followDocLink) {
                this.apiClient.fetch(metadataObject['apiDocumentation'], [this]);
                this.apiClient.subjectStream.unshift({ apiDoc: metadataObject['apiDocumentation'] });
                this.followDocLink = false;
            }
            else {
                if (Object.keys(metadataObject).length > 0) {
                    this.metadataCallback(metadataObject);
                }
            }
        }
        else {
            if (Object.keys(metadataObject).length > 0) {
                this.metadataCallback(metadataObject);
            }
        }
    };
    //Constants
    MyMetadataApiHandler.API_DOCUMENTATION = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#apiDocumentation');
    MyMetadataApiHandler.API_TITLE_1 = data_model_1.namedNode('http://purl.org/dc/terms/title');
    MyMetadataApiHandler.API_TITLE_2 = data_model_1.namedNode('http://www.w3.org/ns/hydra/core#title');
    MyMetadataApiHandler.API_DESCRIPTION = data_model_1.namedNode('http://w3.org/ns/hydra/core#description');
    MyMetadataApiHandler.API_ISSUED = data_model_1.namedNode('http://purl.org/dc/terms/issued');
    MyMetadataApiHandler.API_MODIFIED = data_model_1.namedNode('http://purl.org/dc/terms/modified');
    MyMetadataApiHandler.API_LICENSE = data_model_1.namedNode('http://purl.org/dc/terms/license');
    MyMetadataApiHandler.API_CONTACT_POINT = data_model_1.namedNode('https://schema.org/contactPoint');
    MyMetadataApiHandler.API_CONTACT_NAME = data_model_1.namedNode('https://schema.org/contactnaam');
    MyMetadataApiHandler.API_CONTACT_EMAIL = data_model_1.namedNode('https://schema.org/email');
    MyMetadataApiHandler.API_CONTACT_TELEPHONE = data_model_1.namedNode('http://schema.org/telephone');
    MyMetadataApiHandler.API_TEMPORAL = data_model_1.namedNode('http://purl.org/dc/terms/temporal');
    MyMetadataApiHandler.API_START_DATE = data_model_1.namedNode('http://schema.org/startDate');
    MyMetadataApiHandler.API_END_DATE = data_model_1.namedNode('http://schema.org/endDate');
    MyMetadataApiHandler.API_SPATIAL = data_model_1.namedNode('http://purl.org/dc/terms/spatial');
    MyMetadataApiHandler.API_GEOMETRY = data_model_1.namedNode('http://www.w3.org/ns/locn#geometry');
    return MyMetadataApiHandler;
}());
exports.MyMetadataApiHandler = MyMetadataApiHandler;
