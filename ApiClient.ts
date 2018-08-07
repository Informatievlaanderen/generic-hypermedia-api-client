import {MyMetadataApiHandler} from "./MyMetadataApiHandler";
import {IApiHandler} from "./IApiHandler";
import {PaginationHandler} from "./PaginationHandler";

//require('es6-promise').polyfill();
require('isomorphic-fetch');
const stringToStream = require('string-to-stream');
const RDF = require('rdf-ext');
const formats = require('rdf-formats-common')(RDF);


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

    constructor(args: IApiClientArgs) {
        if (args != null) {
            this.fetcher = args.fetch != null ? args.fetch : fetch;
            this.parser = args.rdfParser != null ? args.rdfParser : null;
        } else {
            this.fetcher = fetch;
            this.parser = null;
        }
    }

    /**
     * Fetch the given URL and invoke the given handlers on the response.
     * @param {string} url The URL to fetch.
     * @param {IApiHandler[]} handlers An array of handlers to invoke on the response.
     */
    fetch(url: string, handlers: IApiHandler[]): void {
        this.fetcher(url).then(response => {
            //Http
            for (let i = 0; i < handlers.length; i++) {
                handlers[i].onFetch(response);
            }
            const contentType = response.headers.get('content-type').split(';')[0];

            //Semantic
            response.json().then(json => {
                if(!this.parser){
                    this.parser = formats.parsers.find(contentType);
                }
                try {
                    let stream = this.parser.import(stringToStream(JSON.stringify(json)));
                    stream.on('data', (quad) => {
                        for (let i = 0; i < handlers.length; i++) {
                            handlers[i].onQuad(quad);
                        }
                    });
                    stream.on('end', () => {
                        for (let i = 0; i < handlers.length; i++) {
                            handlers[i].onEnd();
                        }
                    });
                } catch(e){
                    console.log(e);
                }
            })
        })
    }
}

//TEST PROGRAM
try {
    const client = new ApiClient(null);
    client.fetch("https://graph.irail.be/sncb/connections",
        [
            //new MyMetadataApiHandler((metadata) => console.log(metadata), client, true),
            new PaginationHandler((pages) => console.log(pages))
        ]);
}