import {ApiClient} from "../lib/ApiClient";
import {Readable} from "stream";
import {PaginationHandler} from "../lib/PaginationHandler";

const RDF = require('rdf-ext');
const stringToStream = require('string-to-stream');
const formats = require('rdf-formats-common')(RDF);
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fetchMock = require('fetch-mock');

describe('The PaginationHandler module', () => {
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
    });

    it('should be a PaginationHandler constructor', () => {
        expect(new (<any> PaginationHandler)({
            pagedataCallback: (pagedata) => {
            }, subjectStream: client.subjectStream
        })).toBeInstanceOf(PaginationHandler);
    })

    it('should throw an error if no arguments were given', () => {
        expect(() => {
            (<any> PaginationHandler)({})
        }).toThrow();
    })

    it('should extract info from the Link header if present', async () => {
        fetchMock.get('http://google.com', {
            status: 200,
            headers: {
                'link': '<https://google.com/api/resource?page=4&limit=100>; rel="next"'
            }
        });
        const response = await fetch('http://google.com');
        console.log(response.headers);
        let result = {};
        const paginationHandler = new PaginationHandler({
            pagedataCallback: (data) => {
                result = data
            },
            subjectStream: client.subjectStream
        });
        paginationHandler.onFetch(response);
        paginationHandler.onEnd();

        const expected = {
            first: null,
            next: 'https://google.com/api/resource?page=4&limit=100',
            last: null,
            prev: null
        }

        expect(result).toEqual(expected);
    })

    it('should return pagedate if found', async () => {
        const doc = {
            "@context": "http://www.w3.org/ns/hydra/context.jsonld",
            "@id": "/api/pagination",
            "@type": "PartialCollection",
            "next": "/api/resource?page=4",
            "previous": "/api/resource?page=2"
        }

        let result = {};
        const paginationHandler = new PaginationHandler({
            pagedataCallback: (pagedata) => {
                result = pagedata
            },
            subjectStream: client.subjectStream
        });
        paginationHandler.subjectURLs.push('http://example.org/api/pagination');

        stream = new parser.Impl(stringToStream(JSON.stringify(doc)), {baseIRI: 'http://example.org'});
        stream.on('data', quad => {
            paginationHandler.onQuad(quad);
        })

        await new Promise((resolve => stream.on('end', resolve)));
        paginationHandler.onEnd();

        const expected = {
            first: null,
            last: null,
            next: 'http://example.org/api/resource?page=4',
            prev: 'http://example.org/api/resource?page=2'
        };
        expect(result).toEqual(expected);
    });
});