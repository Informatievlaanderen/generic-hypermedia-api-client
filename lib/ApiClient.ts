import {IApiHandler} from "./IApiHandler";
import {LanguageHandler} from "./LanguageHandler";
import {VersioningHandler} from "./VersioningHandler";
import {Readable} from "stream";
import {FullTextSearchHandler} from "./FullTextSearchHandler";
import {type} from "os";

const fetch = require('node-fetch').default
require('es6-promise').polyfill();
const stringToStream = require('string-to-stream');
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
    public subjectStream: Readable;
    private subjectURLs: Array<object> = [];
    private startURLAdded: boolean;

    constructor(args: IApiClientArgs) {
        if (args != null) {
            this.fetcher = args.fetch != null ? args.fetch : fetch;
            this.parser = args.rdfParser != null ? args.rdfParser : null;
        } else {
            this.fetcher = fetch;
            this.parser = null;
        }
        this.subjectStream = new stream.Readable({objectMode: true});
        this.subjectStream._read = () => {
        };

        this.subjectStream.on('data', (object) => {
            object = JSON.parse(object.toString());
            this.subjectURLs.push(object[Object.keys(object)[0]]);
        })

        this.startURLAdded = false;
    }

    /**
     * Fetch the given URL and invoke the given handlers on the response.
     * @param {string} url The URL to fetch.
     * @param {IApiHandler[]} handlers An array of handlers to invoke on the response.
     */
    fetch(url: string, handlers: IApiHandler[]): void {
        let headers = new Headers();
        const languageHandler = this.getHandler('LanguageHandler', handlers) as LanguageHandler;
        const versioningHandler = this.getHandler('VersioningHandler', handlers) as VersioningHandler;

        if (languageHandler) {
            headers.append('Accept-Language', languageHandler.acceptLanguageHeader);
        }

        if (versioningHandler) {
            headers.append('Accept-Datetime', versioningHandler.datetime.toString());
        }

        //Fetch URL given as parameter
        this.fetcher(url, {headers: headers}).then(async response => {
            try {
                //The startURL also need to be in the stream
                //This only has to be done 1 time, at the beginning
                if (!this.startURLAdded) {
                    this.subjectStream.unshift(JSON.stringify({url: response.url}));
                    this.startURLAdded = true;
                }

                //Each handler has to execute his onFetch() method
                for (let i = 0; i < handlers.length; i++) {
                    handlers[i].onFetch(response);
                }

                try {
                    const contentType = contentTypeParser.parse(response.headers.get('content-type')).type;
                    let parser = formats.parsers.find(contentType);
                    if (parser) {
                        const stream = new parser.Impl(stringToStream(await response.text()), {baseIRI: response.url});
                        stream.on('data', (quad) => {
                            //If there's a void:subset, we need to add the new URL to the stream and also check its content
                            if (quad.predicate.value === 'http://rdfs.org/ns/void#subset') {
                                if (response.url === quad.object.value && this.subjectURLs.indexOf(quad.object.value) < 0) {
                                    this.subjectStream.unshift(JSON.stringify({url: quad.subject.value}));
                                    this.fetch(quad.subject.value, handlers);
                                }
                            } else {
                                for (let i = 0; i < handlers.length; i++) {
                                    handlers[i].onQuad(quad);
                                }
                            }
                        });

                        stream.on('end', () => {
                            for (let i = 0; i < handlers.length; i++) {
                                handlers[i].onEnd();
                            }
                        });

                        stream.on('error', (error) => {
                            stream.emit('end');
                            console.error('ERROR (ApiClient): ' + error);
                        });
                    } else {
                        //Full Text Search Handler
                        const fullTextSearchHandler = this.getHandler('FullTextSearchHandler', handlers) as FullTextSearchHandler;
                        const versioningHandler = this.getHandler('VersioningHandler', handlers) as VersioningHandler;
                        let querystring = '';

                        if(fullTextSearchHandler || versioningHandler){
                            if (fullTextSearchHandler && !fullTextSearchHandler.parameterURLFetched) {
                                if (contentType.toLocaleLowerCase() === 'application/json' && fullTextSearchHandler.queryValues.length > 1) {
                                    if (!fullTextSearchHandler.queryKeys) {
                                        throw new Error('(FullTextSearchHandler): please give queryKeys in the constructor');
                                    } else if (fullTextSearchHandler.queryKeys.length === fullTextSearchHandler.queryValues.length) {
                                        for (let index in fullTextSearchHandler.queryValues) {
                                            querystring += 'filter[' + fullTextSearchHandler.queryKeys[index] + ']=' + fullTextSearchHandler.queryValues[index] + '&';
                                        }
                                    } else {
                                        throw new Error('(FullTextSearchHandler): there are not as many keys as values');
                                    }
                                } else if (contentType.toLocaleLowerCase() === 'application/json' && fullTextSearchHandler.queryValues.length > 0) {
                                    querystring += 'filter=' + fullTextSearchHandler.queryValues[0];
                                } else {
                                    if (fullTextSearchHandler.queryValues.length !== fullTextSearchHandler.queryValues.length) {
                                        throw new Error('(FullTextSearchHandler): there are not as many keys as values');
                                    } else {
                                        for (let index in fullTextSearchHandler.queryValues) {
                                            querystring += fullTextSearchHandler.queryKeys[index] + '=' + fullTextSearchHandler.queryValues[index] + '&';
                                        }
                                    }
                                }

                                if (querystring.substr(querystring.length - 1, 1) === '&') {
                                    querystring = querystring.substr(0, querystring.length - 1);
                                }

                                querystring = '?' + querystring;
                                const queryURL = response.url + querystring;

                                if (fullTextSearchHandler.fetchQueryURL) {
                                    this.fetch(queryURL, [fullTextSearchHandler]);
                                    fullTextSearchHandler.parameterURLFetched = true;
                                } else if (querystring.indexOf('?') !== querystring.length - 1) {
                                    //We make sure that only correct queryURLs are returned
                                    fullTextSearchHandler.quadStream.unshift(queryURL);
                                }
                            } else if (fullTextSearchHandler && fullTextSearchHandler.parameterURLFetched) {
                                this.streamBodyToClient(fullTextSearchHandler.quadStream, contentType, response);
                            }

                            //VersioningHandler
                            if (versioningHandler) {
                                //If the body is HTML or some type that can't be parsed, we have to stream the body to the client
                                this.streamBodyToClient(versioningHandler.stream, contentType, response);
                            }
                        } else {
                            // For all handlers, except fts and versioning, when the data can not be parsed
                            // the onEnd method is called here
                            for (let i = 0; i < handlers.length; i++) {
                                handlers[i].onEnd();
                            }
                        }


                    }

                } catch (e) {
                    console.error('Error: ' + e.message);
                }
            } catch (e) {
                console.error('Error: ' + e.message);
            }
        }).catch( (error) => {
            console.error('Error: ' + error.message);
        })

    }

    private getHandler(name: string, handlers: IApiHandler[]): IApiHandler {
        let handler = null;
        for (let index in handlers) {
            if (handlers[index].constructor.name === name) {
                handler = handlers[index];
            }
        }
        return handler;
    }

    private streamBodyToClient(stream: Readable, contentType: string, response: Response): void {
        if (contentType.toLocaleLowerCase() === 'application/json') {
            response.json().then(data => {
                stream.unshift(data);
            })
        } else {
            response.text().then(data => {
                stream.unshift(data);
            })
        }
    }
}

