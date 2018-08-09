import {MyMetadataApiHandler} from "./MyMetadataApiHandler";
import {IApiHandler} from "./IApiHandler";
import {PaginationHandler} from "./PaginationHandler";

require('es6-promise').polyfill();
require('isomorphic-fetch');
const RDF = require('rdf-ext');
const formats = require('rdf-formats-common')(RDF);
const stream = require('stream');


interface IApiClientArgs {
    fetch?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
    rdfParser?: any; //SomeParserType (more specific);
}

/**
 * An API Client is used to discover capabilities of a certain API.
 * It has an internal fetch method and RDF parser.
 */
export class ApiClient {

    private fetcher: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    private parser: any;
    public subjectStream: NodeJS.ReadableStream;
    private startURLAdded: boolean;

    constructor(args: IApiClientArgs) {
        if (args != null) {
            this.fetcher = args.fetch != null ? args.fetch : fetch;
            this.parser = args.rdfParser != null ? args.rdfParser : null;
        } else {
            this.fetcher = fetch;
            this.parser = null;
        }
        this.subjectStream = new stream.Readable();
        this.subjectStream._read = () => {};

        this.startURLAdded = false;
    }

    /**
     * Fetch the given URL and invoke the given handlers on the response.
     * @param {string} url The URL to fetch.
     * @param {IApiHandler[]} handlers An array of handlers to invoke on the response.
     */
    fetch(url: string, handlers: IApiHandler[]): void {
        this.fetcher(url).then(response => {
            for (let i = 0; i < handlers.length; i++) {
                handlers[i].onFetch(response);
            }

            if(!this.startURLAdded){
                this.subjectStream.unshift(response.url);
                this.startURLAdded = true;
            }

            const contentType = response.headers.get('content-type').split(';')[0];

            let parser = formats.parsers.find(contentType);
            let stream = new parser.Impl(response.body);

            stream.on('data', (quad) => {
                if(quad.predicate.value === 'http://rdfs.org/ns/void#subset'){
                    this.subjectStream.unshift(quad.subject.value);
                    this.fetch(quad.subject.value, handlers);
                } else {
                    for(let i = 0 ; i < handlers.length ; i++){
                        handlers[i].onQuad(quad);
                    }
                }
            });

            stream.on('end', () => {
                for(let i = 0 ; i < handlers.length ; i++){
                    handlers[i].onEnd();
                }
            });

            stream.on('error', (error) => {
                console.error('ERROR: ' + error);
            });
        })
    }
}

//TEST PROGRAM

//https://datapiloten.be/parking/catalog.ttl
//https://graph.irail.be/sncb/connections
try {
    const client = new ApiClient(null);
    client.fetch("https://graph.irail.be/sncb/connections",
        [
            new MyMetadataApiHandler(
                {metadataCallback: (metadata) => console.log(metadata),
                    apiClient: client,
                    followDocumentationLink: true,
                    subjectStream: client.subjectStream
                })
            new PaginationHandler(
                {pagedataCallback: (pages) => console.log(pages),
                    subjectStream: client.subjectStream
                })
        ]);
}