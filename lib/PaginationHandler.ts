import {IApiHandler} from "./IApiHandler";
import * as RdfTerm from "rdf-string";

const linkParser = require('parse-link-header');
import {namedNode} from "@rdfjs/data-model";
import * as RDF from "rdf";
import {Readable} from "stream";

interface IPaginationHandlerArgs {
    pagedataCallback: (data) => void;
    subjectStream: Readable;
}

export class PaginationHandler implements IApiHandler {
    private pagedataCallback: any;

    public subjectURLs: Array<string>;
    private unidentifiedQuads: { [key: string]: {} } = {};
    private subjectPageData: { [key: string]: {} } = {};

    private readonly FIRST = namedNode('http://www.w3.org/ns/hydra/core#first');
    private readonly NEXT = namedNode('http://www.w3.org/ns/hydra/core#next');
    private readonly PREVIOUS = namedNode('http://www.w3.org/ns/hydra/core#previous');
    private readonly LAST = namedNode('http://www.w3.org/ns/hydra/core#last');

    private pagedataFields: Array<string> = ['first', 'next', 'last', 'prev'];

    constructor(args: IPaginationHandlerArgs) {
        if (!args.pagedataCallback || !args.subjectStream) {
            throw new Error('(PaginationHandler): constructor expects 2 arguments');
        } else {
            this.pagedataCallback = args.pagedataCallback;
            this.subjectURLs = [];
            args.subjectStream.on('data', (object) => {
                object = JSON.parse(object.toString());
                if (object['url']) {
                    this.subjectURLs.push(object['url']);
                } else if (object['apiDoc']) {
                    this.subjectURLs.unshift(object['apiDoc']);
                }
            });
        }
    }

    onFetch(response: Response) {
        if (response.headers.has('link')) {
            let result = linkParser(response.headers.get('link'));
            Object.keys(result).forEach((key) => {
                if (this.pagedataFields.indexOf(key) >= 0) {
                    this.subjectPageData[key] = {value: result[key]['url'], priority: 0};
                }
            });

        }
    }

    onQuad(quad: RDF.Quad) {
        let urlMatched = false;
        for (let index in this.subjectURLs) {
            const subjectURL = this.subjectURLs[index];
            if (RdfTerm.termToString(quad.subject) === subjectURL) {
                urlMatched = true;
                //Process the quad and add its info to the subjectPageData
                this.checkPredicates(quad, (data) => {
                    if (Object.keys(data).length > 0) {
                        const key = Object.keys(data)[0];
                        const pageDataPart = this.subjectPageData[key];
                        if (!pageDataPart || pageDataPart['priority'] > parseInt(index) + 1) {
                            this.subjectPageData[key] = {value: data[key], priority: parseInt(index) + 1}
                        }
                    }
                })
            }

            for (let subjectValue in this.unidentifiedQuads) {
                //If there's already data for the URL, move it to the subjectPageData
                if (subjectValue === subjectURL) {
                    const data = this.unidentifiedQuads[subjectValue];
                    Object.keys(data).forEach((key) => {
                        if (!this.subjectPageData[key]) {
                            this.subjectPageData[key] = {};
                        }

                        if (this.subjectPageData[key]['priority'] > parseInt(index) + 1) {
                            this.subjectPageData[key] = {value: data[key], priority: parseInt(index) + 1};
                        }
                    });
                    delete this.unidentifiedQuads[subjectValue];

                }
            }
        }

        //The URL has not been discovered (yet)
        if (!urlMatched) {
            this.checkPredicates(quad, (pagedata) => {
                Object.keys(pagedata).forEach((key) => {
                    if (!this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]) {
                        this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = {};
                    }
                    this.unidentifiedQuads[RdfTerm.termToString(quad.subject)][key] = pagedata[key];
                })
            })
        }
    }

    checkPredicates(quad: RDF.Quad, dataCallback: (data) => void) {
        let match = {};

        if (quad.predicate.equals(this.FIRST)) {
            match["first"] = quad.object.value;
        }
        if (quad.predicate.equals(this.NEXT)) {
            match["next"] = quad.object.value;
        }

        if (quad.predicate.equals(this.PREVIOUS)) {
            match["prev"] = quad.object.value;
        }

        if (quad.predicate.equals(this.LAST)) {
            match["last"] = quad.object.value;
        }

        dataCallback(match);
    }

    onEnd() {
        let pagedataObject = {};
        for (let index in this.pagedataFields) {
            let pagedataField = this.pagedataFields[index];

            if (!this.subjectPageData[pagedataField]) {
                pagedataObject[pagedataField] = null;
            } else {
                pagedataObject[pagedataField] = this.subjectPageData[pagedataField]['value'];
            }
        }
        console.log('This pagedata was found: ');
        this.pagedataCallback(pagedataObject);
    }
}