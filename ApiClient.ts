import {IApiHandler} from "./IApiHandler";
import {LanguageHandler} from "./LanguageHandler";
import {VersioningHandler} from "./VersioningHandler";

require('es6-promise').polyfill();
require('isomorphic-fetch');
const RDF = require('rdf-ext');
const formats = require('rdf-formats-common')(RDF);
const stream = require('stream');
var contentTypeParser = require('content-type');


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
        this.subjectStream = new stream.Readable({ objectMode: true});
        this.subjectStream._read = () => {
        };

        this.startURLAdded = false;
    }

    /**
     * Fetch the given URL and invoke the given handlers on the response.
     * @param {string} url The URL to fetch.
     * @param {IApiHandler[]} handlers An array of handlers to invoke on the response.
     */
    fetch(url: string, handlers: IApiHandler[]): void {
        let headers = new Headers();
        handlers.filter(handler => {
            if (handler.constructor.name === 'LanguageHandler') {
                let object = handler as LanguageHandler;
                headers.append('Accept-Language', object.acceptLanguageHeader);
            } else if(handler.constructor.name === 'VersioningHandler'){
                let object = handler as VersioningHandler;
                if(object.datetime){
                    headers.append('Accept-Datetime', object.datetime);
                } else {
                    headers.append('Link', object.version)
                }
            }
        });

        //Fetch URL given as parameter
        this.fetcher(url, {headers: headers}).then(response => {
            try {
                //The startURL also need to be in the stream
                //This only has to be done 1 time, at the beginning
                if (!this.startURLAdded) {
                    this.subjectStream.unshift({url: response.url});
                    this.startURLAdded = true;
                }

                //Each handler has to execute his onFetch() method
                for (let i = 0; i < handlers.length; i++) {
                    handlers[i].onFetch(response);
                }

                try {
                    const contentType = contentTypeParser.parse(response.headers.get('content-type')).type;
                    let parser = formats.parsers.find(contentType);

                    if(parser){
                        let stream = new parser.Impl(response.body, {baseIRI: response.url});
                        stream.on('data', (quad) => {
                            //If there's a void:subset, we need to add the new URL to the stream and also check its content
                            if (quad.predicate.value === 'http://rdfs.org/ns/void#subset') {
                                this.subjectStream.unshift({url: quad.subject.value});
                                this.fetch(quad.subject.value, handlers);
                            } else {
                                for (let i = 0; i < handlers.length; i++) {
                                    handlers[i].onQuad(quad);
                                }
                            }
                        });

                        stream.on('end', () => {
                            for (let i = 0; i < handlers.length; i++) {
                                console.log('Stream is done for [' + handlers[i].constructor.name + ']');
                                handlers[i].onEnd();
                            }
                        });

                        stream.on('error', (error) => {
                            stream.emit('end');
                            console.error('ERROR (ApiClient): ' + error);
                        });
                    }

                } catch (e) {
                    console.error('Error: ' + e.message);
                }
            } catch (e) {
                console.error('Error: ' + e.message);
            }
        })
    }
}

