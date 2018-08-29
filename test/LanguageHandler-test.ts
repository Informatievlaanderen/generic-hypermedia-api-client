import {ApiClient} from "../lib/ApiClient";
import {LanguageHandler} from "../lib/LanguageHandler";
import {Readable} from "stream";

const RDF = require('rdf-ext');
const stringToStream = require('string-to-stream');
const formats = require('rdf-formats-common')(RDF);
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fetchMock = require('fetch-mock');

describe('The LanguageHandler module', () => {
    let client: ApiClient;
    let stream: Readable;

    beforeEach(() => {
        client = new ApiClient({});
        fetchMock.restore();
    });

    afterEach(() => {
        if (stream) {
            stream.unshift(null);
        }
    })

    it('should be a LanguageHandler constructor', () => {
        expect(new (<any> LanguageHandler)({
            languageCallback: (languageData) => {
            }, acceptLanguageHeader: 'nl-BE'
        })).toBeInstanceOf(LanguageHandler);
    });

    it('should throw an error if no arguments were given', () => {
        expect(() => {
            (<any> LanguageHandler)({})
        }).toThrow();
    })

    it('should throw an error if server does not support the requested languages', async () => {
        const data = {test: '1234'};
        fetchMock.get('http://google.com', {
            status: 400
        });
        const response = await fetch('http://google.com');

        const languageHandler = new LanguageHandler({
            languageCallback: data => {
            },
            acceptLanguageHeader: 'nl'
        });

        expect(() => languageHandler.onFetch(response)).toThrow();
    });

    it('should extract the by server chosen language from the Content-Language header', async () => {
        fetchMock.get('http://example.org', {
            status: 200,
            headers: {
                'content-language': 'en'
            }
        });
        const response = await fetch('http://example.org');


        let data = await new Promise(resolve => {
            const languageHandler = new LanguageHandler({
                languageCallback: async data => {
                    data.stream.on('data', resolve);
                },
                acceptLanguageHeader: 'en;q=0.9,fr;q=0.6'
            });
            languageHandler.onFetch(response);
        });

        expect(data).toEqual('en');
    });

    it('it should filter out the quads in other languages and stream quads in the correct language', async () => {
        const doc = {
            "@context": {
                "label": {"@id": "http://www.w3.org/2000/01/rdf-schema#label", "@container": "@language"}
            },
            "@id": "/api/language/1",
            "label": {
                "nl-be": ["België", "Frankrijk", "Nederland"],
                "en-us": ["Belgium", "France", "Netherlands"],
                "fr-CA": ["Belgique", "France", "Pays-bas"]
            }

        };

        fetchMock.get('http://example.org', {
            headers: {
                'content-language': 'nl-be'
            }
        });
        const response = await fetch('http://example.org');

        const parser = formats.parsers.find('application/ld+json');
        const stream = new parser.Impl(stringToStream(JSON.stringify(doc)), {baseIRI: 'http://example.org'});

        let array = [];
        const languageHandler = new LanguageHandler({
            acceptLanguageHeader: 'nl',
            languageCallback: callback => {
                callback.stream.on('data', data => {
                    array.push(data);
                });
            }
        });
        languageHandler.onFetch(response);

        stream.on('data', quad => {
            languageHandler.onQuad(quad);
        });

        await new Promise((resolve) => stream.on('end', resolve));
        const chosenLanguage = array.shift();
        for(let index in array){
            const quad = array[index];
            console.log(quad);
            if(quad.object.termType === 'Literal'){
                expect(quad.object.language).toBe(chosenLanguage);
            }
        }

    })
});