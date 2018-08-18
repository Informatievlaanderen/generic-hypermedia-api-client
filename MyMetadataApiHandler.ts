import {IApiHandler} from "./IApiHandler";
import {ApiClient} from "./ApiClient";
import * as RdfTerm from "rdf-string";
import {namedNode} from "@rdfjs/data-model";

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
    private unidentifiedQuads: { [key: string]: [] } = {};    //Contains all quads whose URL (subject) has not been discovered (yet).
    private identifiedQuads: { [key: string]: [] } = {};
    private subjectMetadata: { [key: string]: {} } = {};    //Object that contains THE information that will be returned to the client

    private baseIRI: string;

    //Constants
    private static readonly API_DOCUMENTATION = namedNode('http://www.w3.org/ns/hydra/core#apiDocumentation');
    private static readonly API_TITLE_1 = namedNode('http://purl.org/dc/terms/title');
    private static readonly API_TITLE_2 = namedNode('http://www.w3.org/ns/hydra/core#title');
    private static readonly API_CONTACT_NAME = namedNode('https://schema.org/contactnaam');
    private static readonly API_CONTACT_EMAIL = namedNode('https://schema.org/email');
    private static readonly API_CONTACT_TELEPHONE = namedNode('http://schema.org/telephone');
    private static readonly API_GEOMETRY = namedNode('http://www.w3.org/ns/locn#geometry');
    private static readonly API_START_DATE = namedNode('http://schema.org/startDate');
    private static readonly API_END_DATE = namedNode('http://schema.org/endDate')

    private static readonly API_TEMPORAL = namedNode('http://purl.org/dc/terms/temporal');
    private static readonly API_SPATIAL = namedNode('http://purl.org/dc/terms/spatial');
    private static readonly API_CONTACT_POINT = namedNode('https://schema.org/contactPoint');

    private myQuads: Array<any> = [];

    private metadataFields: Array<string> =
        ['apiDocumentation', 'apiTitle', 'apiContactName', 'apiContactEmail', 'apiContactTelephone', /*'temporal', 'spatial',*/ 'geometry', 'startDate', 'endDate'];

    constructor(args: IMetadataHandlerArgs) {
        this.metadataCallback = args.metadataCallback;
        this.apiClient = args.apiClient;
        this.followDocLink = args.followDocumentationLink;

        this.subjectURLs = [];
        //Listener for subjectstream from client.
        //Every time a new url is added to the stream, the fetch method from the client with this new url is executed.
        args.subjectStream.on('data', (object) => {
            if(object['url']){
                this.subjectURLs.push(object['url']);
            } else if(object['apiDoc']){
                this.subjectURLs.unshift(object['apiDoc']);
            }
        });

    }

    onFetch(response: Response) {
        //Check the header, and check its API documentation link.
        if (response.headers.has('link')) {
            if (!this.identifiedQuads['apiDocumentation']) {
                this.identifiedQuads['apiDocumentation'] = [];
            }

            let object = linkParser(response.headers.get('link'));
            let rel = Object.keys(object)[0];
            let link = object[rel].url;

            const priority = this.subjectURLs.indexOf(response.url);
            if(priority >= 0){
                this.identifiedQuads['apiDocumentation'].push({ value: link, priority: priority+1});
            }


        }

        this.baseIRI = response.url;
    }

    onQuad(quad: RDF.Quad) {
        let urlMatched = false;

        for (let index in this.subjectURLs) {
            const subjectURL = this.subjectURLs[index];

            //The subject of the quad is known, so process this quad and if data, store it in identified quads
            if (RdfTerm.termToString(quad.subject) === subjectURL) {
                urlMatched = true;
                this.checkPredicates(quad, (data) => {
                    if (Object.keys(data).length > 0) {
                        const predicateVal = Object.keys(data)[0];

                        if (!this.identifiedQuads[predicateVal]) {
                            this.identifiedQuads[predicateVal] = [];
                        }

                        this.identifiedQuads[predicateVal].push({value: data[predicateVal], priority: parseInt(index)+1});     //TODO: info of api doc has bigger priority
                    }
                });
            }

            //For every URL in subjectURLs we have to check if there are quads in unidentified quads.
            //If so, then move them to identified quads
            for (let subjectVal in this.unidentifiedQuads) {
                if (subjectVal === subjectURL) {
                    for (let index in this.unidentifiedQuads[subjectVal]) {
                        const object = this.unidentifiedQuads[subjectVal][index];
                        if (!this.identifiedQuads[object['predicate']]) {
                            this.identifiedQuads[object['predicate']] = [];
                        }

                        this.identifiedQuads[object['predicate']].push({
                            value: object['value'],
                            priority: parseInt(index)+1
                        });
                    }
                }
            }
        }

        if (!urlMatched) {
            this.checkPredicates(quad, (data) => {
                if (Object.keys(data).length > 0) {
                    const predicateVal = Object.keys(data)[0];

                    if (!this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]) {
                        this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = [];
                    }

                    this.unidentifiedQuads[RdfTerm.termToString(quad.subject)].push({
                        predicate: predicateVal,
                        value: data[predicateVal]
                    });
                }
            })
        }
    }

    checkPredicates(quad: RDF.Quad, dataCallback: () => any) {
        let match = {};

        if (quad.predicate.equals(MyMetadataApiHandler.API_DOCUMENTATION)) {
            match['apiDocumentation'] = this.baseIRI + quad.object.value;

        }

        if (quad.predicate.equals(MyMetadataApiHandler.API_TITLE_1) || quad.predicate.equals(MyMetadataApiHandler.API_TITLE_2)) {
            match['apiTitle'] = RdfTerm.termToString(quad.object);
        }

        if (quad.predicate.equals(MyMetadataApiHandler.API_CONTACT_POINT) || quad.predicate.equals(MyMetadataApiHandler.API_TEMPORAL) || quad.predicate.equals(MyMetadataApiHandler.API_SPATIAL)) {
            //Check if there are triples with this quad its object as subject
            //If so, store them with the subject URL of this triple (schema:contactPoint)
            this.myQuads.push(quad);
        }

        //Belongs to schema:contactPoint
        if (quad.predicate.equals(MyMetadataApiHandler.API_CONTACT_NAME)) {
            match['apiContactName'] = RdfTerm.termToString(quad.object);
        }

        //Belongs to schema:contactPoint
        if (quad.predicate.equals(MyMetadataApiHandler.API_CONTACT_EMAIL)) {
            match['apiContactEmail'] = RdfTerm.termToString(quad.object);
        }

        //Belongs to schema:contactPoint?
        if (quad.predicate.equals(MyMetadataApiHandler.API_CONTACT_TELEPHONE)) {
            match['apiContactTelephone'] = RdfTerm.termToString(quad.object);
        }

        //TODO : fix this please
        if (quad.predicate.equals(MyMetadataApiHandler.API_GEOMETRY)) {
            match['geometry'] = RdfTerm.termToString(quad.object);
        }
        //TODO : fix this please
        if (quad.predicate.equals(MyMetadataApiHandler.API_START_DATE)) {
            match['startDate'] = RdfTerm.termToString(quad.object);
        }
        //TODO : fix this please
        if (quad.predicate.equals(MyMetadataApiHandler.API_END_DATE)) {
            match['endDate'] = RdfTerm.termToString(quad.object);
        }

        dataCallback(match);
    }

    // TODO: this metadatacallback is for emitting _all_ metadata at once,
    // but if we want, we could have separate callbacks for each metadata type,
    // then we could potentially invoke the callback much sooner.
    onEnd() {
        //We have to check the quads in the unidentified quads because the last quad could have an object.value that is linked to the subject.value
        //of quads stored in the unidentified quads.
        for (let i in this.myQuads) {
            const quad = this.myQuads[i];
            if (this.unidentifiedQuads.hasOwnProperty(RdfTerm.termToString(quad.object))) {
                const priority = this.subjectURLs.indexOf(RdfTerm.termToString(quad.subject));
                if (priority >= 0) {
                    let objects = this.unidentifiedQuads[RdfTerm.termToString(quad.object)];
                    for (let j in objects) {
                        const object = objects[j];

                        if (!this.identifiedQuads[object['predicate']]) {
                            this.identifiedQuads[object['predicate']] = [];
                        }

                        this.identifiedQuads[object['predicate']].push({value: object['value'], priority: priority+1});
                    }
                    delete this.unidentifiedQuads[RdfTerm.termToString(quad.object)];
                }
            }
        }

        let metadataObject = {};
        for (let i in this.metadataFields) {
            const metadata = this.metadataFields[i];
            if (this.identifiedQuads.hasOwnProperty(metadata)) {
                const values = this.identifiedQuads[metadata];

                let valueWithHighestPriority = values[0]['value'];
                let highestPriority = values[0]['priority'];

                for (let j = 1; j < values.length; j++) {
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
                this.apiClient.subjectStream.unshift({apiDoc: metadataObject['apiDocumentation']});
                this.followDocLink = false;
            } else {
                if (Object.keys(metadataObject).length > 0) {
                    this.metadataCallback(metadataObject);
                }
            }
        } else {

            if(Object.keys(metadataObject).length > 0){
                this.metadataCallback(metadataObject);
            }
        }
    }
}