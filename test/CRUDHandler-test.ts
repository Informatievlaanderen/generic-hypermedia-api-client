import {ApiClient} from "../lib/ApiClient";
import {Readable} from "stream";
import {CRUDHandler} from "../lib/CRUDHandler";

const RDF = require('rdf-ext');
const stringToStream = require('string-to-stream');
const formats = require('rdf-formats-common')(RDF);
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fetchMock = require('fetch-mock');

describe('The CRUDHandler module', () => {
    let client: ApiClient;
    let stream: Readable;
    let parser: any;

    beforeEach(() => {
        client = new ApiClient({});
        parser = formats.parsers.find('application/ld+json');
        fetchMock.restore();
    });

    afterEach(() => {
        if (stream) {
            stream.unshift(null);
        }
    })

    it('should be a CRUDHandler constructor', () => {
        expect(new (<any> CRUDHandler)({
            crudCallback: (crudData) => {
            }
        })).toBeInstanceOf(CRUDHandler);
    })

    it('should throw an error if no arguments were given', () => {
        expect(() => {
            (<any> CRUDHandler)({})
        }).toThrow();
    })

    it('should extract the possible operations from the Allow header if present', async () => {
        fetchMock.get('http://example.org', {
            status: 200,
            headers: {
                'allow': 'GET,POST'
            }
        });
        const response = await fetch('http://example.org');
        let operations = [];
        const crud = new CRUDHandler({
            crudCallback: data => operations = data
        });
        crud.onFetch(response);
        crud.onEnd();

        const expected = [{method: 'GET'}, {method: 'POST'}];

        expect(operations).toEqual(expected);

    });

    it('should return the possible CRUD operations if found', async () => {

        const doc = {
            "@context": [
                "http://www.w3.org/ns/hydra/context.jsonld",
                {
                    "sh": "http://www.w3.org/ns/shacl#",
                    "schema": "https://schema.org/"
                }
            ],
            "@id": "/crud",
            "title": "Een voorbeeld resource",
            "description": "Deze resource kan verwijderd worden met een HTTP DELETE request of aangepast worden met een HTTP PUT request",
            "operation": [
                {
                    "@type": "Operation",
                    "method": "GET"
                },
                {
                    "@type": "Operation",
                    "method": "PUT",
                    "expects": "schema:Event"
                },
                {
                    "@type": "Operation",
                    "method": "POST",
                    "expects": "schema:Event"
                }
            ]
        };

        fetchMock.get('http://example.org/crud', doc);

        const response = await fetch('http://example.org/crud');

        let result = {};
        const crud = new CRUDHandler({
            crudCallback: (operations) => result = operations
        });

        crud.onFetch(response);

        stream = new parser.Impl(stringToStream(response.body), {baseIRI: 'http://example.org'});
        stream.on('data', quad => {
            crud.onQuad(quad);
        });
        stream.on('error', e =>{});

        await new Promise((resolve => stream.on('end', resolve)));
        crud.onEnd();

        const expected = [
            {method: 'GET'},
            {expects: 'https://schema.org/Event', method: 'PUT'},
            {expects: 'https://schema.org/Event', method: 'POST'}
        ]

        expect(result).toEqual(expected);

    })
})