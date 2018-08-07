"use strict";
exports.__esModule = true;
var MyMetadataApiHandler = /** @class */ (function () {
    // TODO : change to interface
    function MyMetadataApiHandler(metadataCallback, apiClient, followDocumentationLink) {
        this.metadataCallback = metadataCallback;
        this.apiClient = apiClient;
        this.followDocLink = followDocumentationLink;
    }
    /*constructor(args: IMetadataHandlerArgs){
        this.metadataCallback = args.metadataCallback;
        this.apiClient = args.apiClient;
        this.followDocLink = args.followDocumentationLink;
    }*/
    MyMetadataApiHandler.prototype.onFetch = function (response) {
        //Check the header, and check its API documentation link.
        if (response.headers.get('link') != null) {
            var link = response.headers.get('link').split(';')[0];
            this.apiDocumentation = link.substr(1, link.length - 2);
        }
    };
    // TODO : check to what subject a metadata field is connected
    // For example only the dct:title related to the api title is extracted and not all the other dct:title fields
    MyMetadataApiHandler.prototype.onQuad = function (quad) {
        //Search for API doc predicates
        //API documentation link
        if (this.apiDocumentation || quad.predicate.value === 'http://www.w3.org/ns/hydra/core#apiDocumentation') {
            if (!this.apiDocumentation) {
                this.apiDocumentation = quad.subject.value;
            }
            if (this.followDocLink) {
                this.apiClient.fetch(this.apiDocumentation, [this]);
                this.followDocLink = false;
            }
        }
        //Title of the API
        if (!this.apiTitle && quad.predicate.value === 'http://purl.org/dc/terms/title') {
            this.apiTitle = quad.object.value;
        }
        //Contact details (name)
        if (!this.apiContactName && quad.predicate.value === 'http://xmlns.com/foaf/0.1/name') {
            this.apiContactName = quad.object.value;
        }
        //Contact details (email)
        if (!this.apiContactEmail && quad.predicate.value === 'http://schema.org/email') {
            this.apiContactEmail = quad.object.value;
        }
        //Contact details (phone number)
        if (!this.apiContactPhoneNumber && quad.predicate.value === 'http://schema.org/telephone') {
            this.apiContactPhoneNumber = quad.object.value;
        }
        //Temporal characteristics of the resource.
        if (!this.temporal && quad.predicate.value === 'http://purl.org/dc/terms/temporal') {
            this.temporal = quad.object.value;
        }
        //Spatial characteristics of the resource
        if (!this.spatial && quad.predicate.value === 'http://purl.org/dc/terms/spatial') {
            this.spatial = quad.object.value;
        }
        //TODO : available resources
    };
    MyMetadataApiHandler.prototype.onEnd = function () {
        //Emit all discovered metadata in the callback
        this.metadataCallback({
            apiDocumentation: this.apiDocumentation,
            apiTitle: this.apiTitle,
            apiContactName: this.apiContactName,
            apiContactEmail: this.apiContactEmail,
            apiContactPhoneNumber: this.apiContactPhoneNumber,
            temporal: this.temporal,
            spatial: this.spatial
        });
    };
    return MyMetadataApiHandler;
}());
exports.MyMetadataApiHandler = MyMetadataApiHandler;
