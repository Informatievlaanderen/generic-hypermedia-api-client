import {ApiClient} from "../lib/ApiClient";
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fetchMock = require('fetch-mock');
const RDF = require('rdf-ext');
const formats = require('rdf-formats-common')(RDF);
const JsonLdParser = require('rdf-parser-jsonld');
const N3Parser = require('rdf-parser-n3');

describe('The ApiClient module', () => {
    let client: ApiClient;

    beforeEach(() => {
        client = new ApiClient({});
        fetchMock.restore();
    });

    it('should be an ApiClient constructor', () => {
        expect(new (<any> ApiClient)({})).toBeInstanceOf(ApiClient);
    });

    it('should fetch a given URL', async () => {
        const data = {test: '1234'}
        fetchMock.get('http://example.org', data);
        const response = await fetch('http://example.org');
        const result = await response.json();
        expect(result).toEqual(result);
    });
});

describe('The parser selection module', () => {
    it('should select the correct parser', () => {
        expect(formats.parsers.find('application/ld+json')).toBeInstanceOf(JsonLdParser);
        expect(formats.parsers.find('text/turtle')).toBeInstanceOf(N3Parser);
    });
})