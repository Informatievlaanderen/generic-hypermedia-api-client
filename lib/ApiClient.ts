import {IApiHandler} from "./IApiHandler";
import {LanguageHandler} from "./LanguageHandler";
import {VersioningHandler} from "./VersioningHandler";
import {Readable} from "stream";
import {FullTextSearchHandler} from "./FullTextSearchHandler";
import {type} from "os";

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
        this.subjectStream._read = () => {};

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
        handlers.filter(handler => {
            if (handler.constructor.name === 'LanguageHandler') {
                const object = handler as LanguageHandler;
                headers.append('Accept-Language', object.acceptLanguageHeader);
            } else if (handler.constructor.name === 'VersioningHandler') {
                const object = handler as VersioningHandler;
                if (object.datetime) {
                    headers.append('Accept-Datetime', object.datetime.toString());
                }
            }
        });

        //Fetch URL given as parameter
        this.fetcher(url, {headers: headers}).then(response => {
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
                        const stream = new parser.Impl(response.body, {baseIRI: response.url});
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
                                console.log('Stream is done for [' + handlers[i].constructor.name + ']');
                                handlers[i].onEnd();
                            }
                        });

                        stream.on('error', (error) => {
                            stream.emit('end');
                            console.error('ERROR (ApiClient): ' + error);
                        });
                    } else {
                        handlers.filter((handler) => {
                            //FullTextSearchHandler
                            //If the content-type is JSON , use FILTER parameter and queryValue in constructor to fetch new URL
                            //If content-type is no RDF or JSON, check if instance has queryKey and queryValue and fetch URL with this parameters
                            if (handler.constructor.name === 'FullTextSearchHandler') {
                                let object = handler as FullTextSearchHandler;

                                if (!object.parameterURLFetched) {
                                    let querystring = '';
                                    if (contentType.toLocaleLowerCase() === 'application/json') {
                                        if (object.queryValues.length > 1) {
                                            if (!object.queryKeys) {
                                                throw new Error('(FullTextSearchHandler): please give queryKeys in the constructor');
                                            } else {
                                                if (object.queryKeys.length === object.queryValues.length) {
                                                    for (let index in object.queryValues) {
                                                        querystring += 'filter[' + object.queryKeys[index] + ']=' + object.queryValues[index] + '&';
                                                    }
                                                } else {
                                                    throw new Error('(FullTextSearchHandler): there are not as many keys as values');
                                                }
                                            }
                                        } else {
                                            querystring += 'filter=' + object.queryValues[0];
                                        }
                                    } else {
                                        if (object.queryValues.length !== object.queryValues.length) {
                                            throw new Error('(FullTextSearchHandler): there are not as many keys as values');
                                        } else {
                                            for (let index in object.queryValues) {
                                                querystring += object.queryKeys[index] + '=' + object.queryValues[index] + '&';
                                            }
                                        }
                                    }

                                    if (querystring.substr(querystring.length - 1, 1) === '&') {
                                        querystring = querystring.substr(0, querystring.length - 1);
                                    }

                                    querystring = '?' + querystring;
                                    const queryURL = response.url + querystring;
                                    this.fetch(queryURL, [handler]);
                                    object.parameterURLFetched = true;

                                } else {
                                    if (contentType === 'application/json') {
                                        response.json().then((json) => {
                                            object.quadStream.unshift(json);
                                        });
                                    } else {
                                        response.text().then((text) => {
                                            object.quadStream.unshift(text);
                                        })
                                    }
                                }
                            } else if (handler.constructor.name === 'VersioningHandler') {
                                const object = handler as VersioningHandler;
                                //If the body is HTML or some type that can't be parsed, we have to stream the body to the client
                                if (contentType === 'application/json') {
                                    response.json().then((json) => {
                                        object.stream.unshift(json);
                                    });
                                } else {
                                    response.text().then((text) => {
                                        object.stream.unshift(text);
                                    })
                                }
                            }
                        })
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

