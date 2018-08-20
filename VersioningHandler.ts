import {IApiHandler} from "./IApiHandler";
import {Readable} from "stream";
import {namedNode} from "@rdfjs/data-model";
import * as RdfTerm from "rdf-string";
import {ApiClient} from "./ApiClient";

const parseLink = require('parse-link-header');

interface IVersionHandlerArgs {
    versionCallback: () => any;
    apiClient: ApiClient;
    datetime: Date;
    followLink: boolean;
}

export class VersioningHandler implements IApiHandler {

    private readonly DATETIME = namedNode('http://www.w3.org/ns/prov#generatedAtTime');
    private readonly VERSION = namedNode('http://semweb.datasciencelab.be/ns/version/#relatedVersion');

    private versionCallback: () => any;
    private apiClient: ApiClient;
    private datetime: Date;
    private followLink: boolean;

    private versionURL: string;

    private myQuads: {[key: string]: [] } = {};   //Key will be graph ID
    private versionFound: boolean;
    private graphID: string;

    private stream: NodeJS.ReadableStream;

    constructor(args: IVersionHandlerArgs){
        this.versionCallback = args.versionCallback;

        this.versionCallback = args.versionCallback
        this.apiClient = args.apiClient;
        this.datetime = args.datetime;
        this.followLink = args.followLink;

        this.versionFound = false;
        this.stream = new Readable({ objectMode: true});
        this.stream._read = () => {};

        this.versionCallback({stream: this.stream});
    }

    onFetch(response: Response) {

        //If there's a memento datetime, the Link header will contain an URL with rel='timegate'
        if(response.headers.has('memento-datetime')){
            const datetime = response.headers.get('memento-datetime');
            const links = response.headers.has('link') && parseLink(response.headers.get('link'));
            if(links && links.timegate){
                this.versionURL = links.timegate.url;
            }
        } else if(response.headers.has('link')){
            //There's no memento-datetime, Link header could contain an URL with rel='alternate'
            const links = parseLink(response.headers.get('link'));
            if(links && links.alternate){
                this.versionURL = links.alternate.url;
            }
        } else {
            console.log('(VersioningHandler) : no versioning for this URL');
            //throw new Error('(VersioningHandler) : no versioning for this URL');
        }

        if(this.versionURL){
            if(this.followLink){
                this.apiClient.fetch(this.versionURL, [this]);
            } else {
                this.stream.unshift(this.versionURL);
            }
        }
    }

    onQuad(quad: RDF.Quad) {
        //The quad with predicate prov:generatedAtTime or ver:relatedVersion has not been found yet, so store all triples in temporary object
        if(!this.versionFound){
            this.checkPredicates(quad, (data) => {
                if(Object.keys(data).length > 0){
                    if(!this.myQuads[RdfTerm.termToString(quad.graph)]){
                        this.myQuads[RdfTerm.termToString(quad.graph)] = [];
                    }
                    this.myQuads[RdfTerm.termToString(quad.graph)].push(data);

                }
            });
        } else{
            //The quad has been found and the graphID is kwown. So start streaming the triples.
            if(this.myQuads[this.graphID].length > 0){
                for(let index in this.myQuads[this.graphID]){
                    const triple = this.myQuads[this.graphID][index];
                    this.stream.unshift(triple);
                }
                delete this.myQuads[this.graphID];
            }

            this.checkPredicates(quad, (data) => {
                if(Object.keys(data).length > 0){
                    this.stream.unshift(data);
                }
            })
        }
    }

    checkPredicates(quad: RDF.Quad, dataCallback: () => any) {
        let triple = {};

        if(!this.versionFound){
            if(quad.predicate.equals(this.DATETIME) || quad.predicate.equals(this.VERSION)){
                this.graphID = RdfTerm.termToString(quad.subject);
                this.versionFound = true;
            } else {
                triple['subject'] = quad.subject;
                triple['predicate'] = quad.predicate;
                triple['object'] = quad.object;
            }
        } else {
            triple['subject'] = quad.subject;
            triple['predicate'] = quad.predicate;
            triple['object'] = quad.object;
        }

        dataCallback(triple);
    }

    onEnd() {
        this.stream.unshift(null);
    }

}