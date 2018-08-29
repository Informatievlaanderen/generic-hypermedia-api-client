import {ApiClient} from "../lib/ApiClient";
import {FullTextSearchHandler} from "../lib/FullTextSearchHandler";
import {Readable} from "stream";

const RDF = require('rdf-ext');
const stringToStream = require('string-to-stream');
const formats = require('rdf-formats-common')(RDF);
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fetchMock = require('fetch-mock');

describe('The FullTextSearchHandler module', () => {
    let client: ApiClient;
    let stream: Readable;
    let parser: any;

    beforeEach(() => {
        client = new ApiClient({});
        fetchMock.restore();
        parser = formats.parsers.find('application/ld+json');
    });

    afterEach( () => {
        if(stream){
            stream.unshift(null);
        }
    });

    it('should throw an error if no arguments were given', () => {
        expect(() => {
            (<any> FullTextSearchHandler)({})
        }).toThrow();
    });

    it('should throw an error if template URL has to be fetched, but no query values were given', () => {
        expect( () => {
            (<any> FullTextSearchHandler)({
                callback: (data) => {},
                apiClient: client,
                fetchQueryURL: true
            })
        }).toThrow();
    })

    it('should be a FullTextSearchHandler constructor without queryKeys', () => {
        expect(new (<any> FullTextSearchHandler)({
            callback: (data) => {},
            apiClient: client,
            fetchQueryURL: false,
            queryValues: ['Bob']
        })).toBeInstanceOf(FullTextSearchHandler);
    });

    it('should be a FullTextSearchHandler constructor with queryKeys', () => {
        expect(new (<any> FullTextSearchHandler)({
            callback: (data) => {
            },
            apiClient: client,
            fetchQueryURL: true,
            queryValues: ['Bob'],
            queryKeys: ['Naam']
        })).toBeInstanceOf(FullTextSearchHandler);
    });

    it('should return the query URL if it does not have to be fetched', async () => {
        const data = {
            "@context": "http://www.w3.org/ns/hydra/context.jsonld",
            "@type": "IriTemplate",
            "@id": "/fts",
            "search": {
                "template": "http://example.org/fts{?filter}",
                "variableRepresentation": "BasicRepresentation",
                "mapping": [
                    {
                        "@type": "IriTemplateMapping",
                        "variable": "filter",
                        "property": "hydra:freetextQuery",
                        "required": true
                    }
                ]
            }
        };
        fetchMock.get('http://example.org', data);
        const response = await fetch('http://example.org');

        stream = new parser.Impl(stringToStream(response.body), {baseIRI: 'http://example.org'});
        let result = ''
        const ftsHandler = new FullTextSearchHandler({
            callback: data => {
                data.stream.on('data', data => {
                    result = data;
                })
            },
            apiClient: client,
            fetchQueryURL: false
        });
        ftsHandler.subjectURLs.push('http://example.org/fts');

        stream.on('data', quad => {
            ftsHandler.onQuad(quad);
        });
        jest.setTimeout(60000);
        await new Promise( resolve => stream.on('end', resolve));
        ftsHandler.onEnd();

        expect(result).toBe('http://example.org/fts{?filter}');
    })

})