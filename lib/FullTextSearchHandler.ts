import {IApiHandler} from "./IApiHandler";
import {Readable} from "stream";
import {namedNode} from "@rdfjs/data-model";
import * as RdfTerm from "rdf-string";
import * as RDF from "rdf";
import {ApiClient} from "./ApiClient";

const template = require('url-template');

interface IFullTextSearchHandlerArgs {
    callback: (data) => void;
    apiClient: ApiClient;
    queryValues: Array<string>,
    queryKeys?: Array<string>;
}

export class FullTextSearchHandler implements IApiHandler {

    private static readonly HYDRA_QUERY_TEMPLATE = namedNode('http://www.w3.org/ns/hydra/core#template');
    private static readonly HYDRA_MAPPING = namedNode('http://www.w3.org/ns/hydra/core#mapping');
    private static readonly HYDRA_VARIABLE = namedNode('http://www.w3.org/ns/hydra/core#variable');
    private static readonly HYDRA_SEARCH = namedNode('http://www.w3.org/ns/hydra/core#search');

    private callback: (data) => void;
    public queryValues: Array<string> = [];
    public queryKeys: Array<string> = [];
    private apiClient: ApiClient;

    private subjectURLs: Array<string> = [];
    public quadStream: Readable;

    private mappingQuads: Array<Object> = [];
    private searchQuads: Array<Object> = [];
    private unidentifiedQuads: { [key: string]: {} } = {};
    private templateURL: string;
    private templateKeys: Array<string> = [];

    public parameterURLFetched: boolean;


    constructor(args: IFullTextSearchHandlerArgs) {
        if(Object.keys(args).length < 3){
            throw new Error('(FullTextSearchHandler): constructor expects at least 3 arguments');
        } else {


            this.callback = args.callback;
            this.queryValues = args.queryValues;
            this.queryKeys = args.queryKeys;
            this.apiClient = args.apiClient;

            this.apiClient.subjectStream.on('data', (object) => {
                object = JSON.parse(object.toString());
                let key = Object.keys(object)[0];
                this.subjectURLs.push(object[key]);
            })

            this.parameterURLFetched = false;

            this.quadStream = new Readable({objectMode: true});
            this.quadStream._read = () => {
            };

            this.callback({stream: this.quadStream});
        }
    }

    onFetch(response: Response) {}


    onQuad(quad: RDF.Quad) {
        if(!this.parameterURLFetched){
            let urlMatch = false;
            for (let i in this.subjectURLs) {
                const subjectURL = this.subjectURLs[i];

                if (RdfTerm.termToString(quad.subject) === subjectURL) {
                    urlMatch = true;
                    this.checkPredicates(quad, (data) => {
                        if (!this.templateURL && data['templateURL']) {
                            this.templateURL = data['templateURL'];
                        } else if (data["templateKey"]) {
                            this.templateKeys.push(data['templateKey']);
                        }
                    });
                }

                for (let subjectValue in this.unidentifiedQuads) {
                    if (subjectValue === subjectURL) {
                        const values = this.unidentifiedQuads[subjectValue];
                        if (!this.templateURL && values['templateURL']) {
                            this.templateURL = values['templateURL'];
                        } else if (values['templateKeys']) {
                            Object.keys(values['templateKeys']).forEach( (index) => {
                                this.templateKeys.push(values['templateKeys'][index]);
                            })
                        }
                    }
                }
            }

            if (!urlMatch) {
                this.checkPredicates(quad, (data) => {
                    if (!this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]) {
                        this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = {};
                    }

                    if (data['templateURL']) {
                        this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]['templateURL'] = data['templateURL'];
                    } else if (data['templateKey']) {
                        if (!this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]['templateKeys']) {
                            this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]['templateKeys'] = [];
                        }
                        this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]['templateKeys'].push(data['templateKey']);
                    }
                })
            }

            for(let i in this.searchQuads){
                const searchQuad = this.searchQuads[i] as RDF.Quad;
                //Check level 1
                if(this.subjectURLs.indexOf(RdfTerm.termToString(searchQuad.subject)) >= 0 && this.unidentifiedQuads[RdfTerm.termToString(searchQuad.object)]){
                    const values = this.unidentifiedQuads[RdfTerm.termToString(searchQuad.object)];
                    if(values['templateURL'] && !this.templateURL){
                        this.templateURL = values['templateURL'];
                    } else if(values['templateKeys']){
                        Object.keys(values['templateKeys']).forEach( (index) => {
                            this.templateKeys.push(values['templateKeys'][index]);
                        })
                    }
                }

                //Check level 2
                for(let j in this.mappingQuads){
                    const mapQuad = this.mappingQuads[j] as RDF.Quad;
                    if (mapQuad.subject.equals(searchQuad.object) && this.subjectURLs.indexOf(RdfTerm.termToString(searchQuad.subject)) >= 0 && this.unidentifiedQuads[RdfTerm.termToString(mapQuad.object)]) {
                        const values = this.unidentifiedQuads[RdfTerm.termToString(mapQuad.object)];
                        if (!this.templateURL && values['templateURL']) {
                            this.templateURL = values['templateURL'];
                        } else if (values['templateKeys']) {
                            Object.keys(values['templateKeys']).forEach( (index) => {
                                this.templateKeys.push(values['templateKeys'][index]);
                            })
                        }
                    }
                }
            }
        } else {
            this.quadStream.unshift(quad);
        }
    }


    checkPredicates(quad: RDF.Quad, dataCallback: (data) => void) {
        let template = {};

        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_QUERY_TEMPLATE)) {
            template['templateURL'] = quad.object.value;
        }

        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_MAPPING)) {
            this.mappingQuads.push(quad);
        }

        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_SEARCH)) {
            this.searchQuads.push(quad);
        }

        if (quad.predicate.equals(FullTextSearchHandler.HYDRA_VARIABLE)) {
            template['templateKey'] = quad.object.value;
        }

        dataCallback(template);
    }

    onEnd() {
        if(!this.parameterURLFetched){
            if(this.templateURL && this.templateKeys.length > 0){
                let parsedURL = template.parse(this.templateURL);

                //The array of values has to have the same length of the array of templateKeys
                //TODO : now client somehow needs to know how many keys there will be, maybe other way to implement it?
                let object = {}
                Object.keys(this.templateKeys).forEach( (index) => {
                    object[this.templateKeys[index]] = this.queryValues[index];
                })
                const queryURL = parsedURL.expand(object);

                this.apiClient.fetch(queryURL, [this]);
                this.parameterURLFetched = true;
            }
        }
    }
}