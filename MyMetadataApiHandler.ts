import {IApiHandler} from "./IApiHandler";
import {ApiClient} from "./ApiClient";
import * as RdfTerm from "rdf-string";
import { namedNode } from "@rdfjs/data-model";
const linkParser = require('parse-link-header');

export interface IMetadataHandlerArgs {
    metadataCallback: () => any;
    apiClient: ApiClient;
    subjectStream: NodeJS.ReadableStream;
    followDocumentationLink?: boolean;
}

export class MyMetadataApiHandler implements IApiHandler {

    private metadataCallback: any;
    private apiClient: ApiClient;
    private followDocLink: boolean;    //Boolean that indicates if a found documentation link has to be fetched

    private subjectURLs: Array<string>; //All URLs that need to be checked against.
    private unidentifiedQuads: { [key: string]: {} } = {};    //Contains all quads whose URL (subject) has not been discovered (yet).
    private subjectMetadata: { [key: string]: {} } = {};    //Object that contains THE information that will be returned to the client

    private baseIRI: string;

    //Constants
    private readonly API_DOCUMENTATION = namedNode('http://www.w3.org/ns/hydra/core#apiDocumentation');
    private readonly API_TITLE_1 = namedNode('http://purl.org/dc/terms/title');
    private readonly API_TITLE_2 = namedNode('http://www.w3.org/ns/hydra/core#title');
    private readonly API_CONTACT_NAME = namedNode('https://schema.org/contactnaam');
    private readonly API_CONTACT_EMAIL = namedNode('https://schema.org/email');
    private readonly API_CONTACT_TELEPHONE = namedNode('http://schema.org/telephone');
    private readonly API_TEMPORAL = namedNode('http://purl.org/dc/terms/temporal');
    private readonly API_SPATIAL = namedNode('http://purl.org/dc/terms/spatial');
    private readonly API_CONTACT_POINT = namedNode('https://schema.org/contactPoint');

    private myQuads: Array<any> = [];

    private metadataFields: Array<string> = ['apiDocumentation', 'apiTitle', 'apiContactName', 'apiContactEmail', 'apiContactTelephone', 'temporal', 'spatial'];

    constructor(args: IMetadataHandlerArgs) {
        this.metadataCallback = args.metadataCallback;
        this.apiClient = args.apiClient;
        this.followDocLink = args.followDocumentationLink;

        this.subjectURLs = [];
        //Listener for subjectstream from client.
        //Every time a new url is added to the stream, the fetch method from the client with this new url is executed.
        args.subjectStream.on('data', (url) => {
            this.subjectURLs.push(url);
        });

    }

    onFetch(response: Response) {
        //Check the header, and check its API documentation link.
        if (response.headers.has('link')) {
            if (!this.subjectMetadata['apiDocumentation']) {
                this.subjectMetadata['apiDocumentation'] = {};
            }

            let object = linkParser(response.headers.get('link'));
            let rel = Object.keys(object)[0];
            let link = object[rel].url;

            this.subjectMetadata['apiDocumentation'] = {objectValue: link, priority: 0};

            if (this.followDocLink) {
                this.apiClient.fetch(this.subjectMetadata['apiDocumentation'].objectValue, [this]);
                this.apiClient.subjectStream.unshift(this.subjectMetadata['apiDocumentation'].objectValue);
            }
        }

        this.baseIRI = response.url;
    }

    onQuad(quad: RDF.Quad) {
        let urlMatched = false;
        for(let index in this.subjectURLs){
            let subjectURL = this.subjectURLs[index];

            if(RdfTerm.termToString(quad.subject) === subjectURL){
                urlMatched = true;
                // Check if there's already data for this URL in myTriples
                for(let subjectValue in this.unidentifiedQuads){
                    if(subjectURL === subjectValue){
                        //Move metadata part from unidentifiedQuads to subject_metadata
                        const data = this.unidentifiedQuads[subjectValue];
                        Object.keys(data).forEach( (key) => {
                            this.subjectMetadata[key] = { objectValue: data[key], priority: index};
                        });
                        delete this.unidentifiedQuads[subjectValue];
                    }
                }

                // Process the quad and if there is a match, add it to the SUBJECT_METADATA
                this.checkPredicates( quad,(metadata) => {
                    Object.keys(metadata).forEach( (key) => {
                        const metadataPart = this.subjectMetadata[key];
                        //Only add to subject_metadata is this part of data is new or has a lower (thus more important) priority
                        if(!metadataPart || metadataPart["priority"] > index){
                            if(key === 'apiDocumentation'){
                                this.subjectMetadata[key] = {objectValue: metadata[key], priority: 0};
                            } else {
                                this.subjectMetadata[key] = {objectValue: RdfTerm.termToString(metadata[key].object), priority: parseInt(index)+1};
                            }
                        }
                    })
                });
            }
        }

        //Process quad and put matches in unidentifiedQuads
        if (!urlMatched) {
            this.checkPredicates(quad, (metadata) => {
                Object.keys(metadata).forEach( (key) => {
                    if (!this.unidentifiedQuads[RdfTerm.termToString(metadata[key].subject)]) {
                        this.unidentifiedQuads[RdfTerm.termToString(metadata[key].subject)] = {};
                    }
                    this.unidentifiedQuads[RdfTerm.termToString(metadata[key].subject)][key] = RdfTerm.termToString(metadata[key].object);
                })
            })
        }
    }

    checkPredicates(quad: RDF.Quad, dataCallback: () => any) {
        let match = {};

        if (quad.predicate.equals(this.API_DOCUMENTATION)) {
            match['apiDocumentation'] = this.baseIRI + quad.object.value;
            if (this.followDocLink) {
                this.apiClient.fetch(match['apiDocumentation'], [this]);
                this.apiClient.subjectStream.unshift(match['apiDocumentation']);
                this.followDocLink = false;
            }
        }

        if(quad.predicate.equals(this.API_TITLE_1) || quad.predicate.equals(this.API_TITLE_2)){
            match['apiTitle'] = quad;
        }

        if(quad.predicate.equals(this.API_CONTACT_POINT)){
            //Check if there are triples with this quad its object as subject
            //If so, store them with the subject URL of this triple (schema:contactPoint)

            if(this.unidentifiedQuads.hasOwnProperty(RdfTerm.termToString(quad.object))){
                let values = this.unidentifiedQuads[RdfTerm.termToString(quad.object)];
                Object.keys(values).forEach( (key) => {
                    if(!this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]){
                        this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = {};
                    }
                    this.unidentifiedQuads[RdfTerm.termToString(quad.subject)][key] = values[key];
                });
            }

            this.myQuads.push(quad);
        }

        //Belongs to schema:contactPoint
        if(quad.predicate.equals(this.API_CONTACT_NAME)){
            Object.keys(this.myQuads).forEach( (index) => {
                if(this.myQuads[index].object.equals(quad.subject)){
                    quad.subject = this.myQuads[index].subject;
                }
            });
            match['apiContactName'] = quad;
        }

        //Belongs to schema:contactPoint
        if(quad.predicate.equals(this.API_CONTACT_EMAIL)){
            Object.keys(this.myQuads).forEach( (index) => {
                if(this.myQuads[index].object.equals(quad.subject)){
                    quad.subject = this.myQuads[index].subject;
                }
            });
            match['apiContactEmail'] = quad;
        }

        //Belongs to schema:contactPoint?
        if(quad.predicate.equals(this.API_CONTACT_TELEPHONE)){
            Object.keys(this.myQuads).forEach( (index) => {
                if(this.myQuads[index].object.equals(quad.subject)){
                    quad.subject = this.myQuads[index].subject;
                }
            });
            match['apiContactTelephone'] = quad;
        }

        if(quad.predicate.equals(this.API_TEMPORAL)){
            match['temporal'] = quad;
        }

        if(quad.predicate.equals(this.API_SPATIAL)){
            match['spatial'] = quad;
        }

        dataCallback(match);
    }

    // TODO: this metadatacallback is for emitting _all_ metadata at once,
    // but if we want, we could have separate callbacks for each metadata type,
    // then we could potentially invoke the callback much sooner.
    onEnd() {
        //We have to check the quads in the unidentified quads because the last quad could has an object.value that is linked to the subject.value
        //of quads stored in that object
        for(let index in this.myQuads){
            if(this.unidentifiedQuads.hasOwnProperty(RdfTerm.termToString(this.myQuads[index].object))){
                //There are quads that need to be transferred.
                let values = this.unidentifiedQuads[RdfTerm.termToString(this.myQuads[index].object)];
                Object.keys(values).forEach( (key) => {
                    this.subjectMetadata[key] = { objectValue : values[key], priority: 5};
                })

            }
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
    }
}