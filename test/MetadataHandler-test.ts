import {ApiClient} from "../lib/ApiClient";
import {Readable} from "stream";
import {MetadataHandler} from "../lib/MetadataHandler";

const RDF = require('rdf-ext');
const JsonLdParser = require('rdf-parser-jsonld');
const stringToStream = require('string-to-stream');
const formats = require('rdf-formats-common')(RDF);
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fetchMock = require('fetch-mock');

describe('The MetadataHandler module', () => {
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

    it('should be a MetadataHandler constructor', () => {
        expect(new (<any> MetadataHandler)({
            metadataCallback: (metadata) => {},
            apiClient: client,
            followDocumentationLink: true
        })).toBeInstanceOf(MetadataHandler);
    });

    it('should throw an error if no metadataCallback was given', () => {
        expect(() => {
            (<any> MetadataHandler)({apiClient: client})
        }).toThrow();
    });

    it('should throw an error if no apiClient was given', () => {
        expect(() => {
            (<any> MetadataHandler)({
                metadataCallback: (metadata) => {
                }
            })
        }).toThrow();
    });

    it('should extract the api documentation link from the Link header if present', async () => {
        fetchMock.get('http://example.org', {
            headers: {
                'link' : '<http://example.org/apidocumentation>; rel="http://www.w3.org/ns/hydra/core#apiDocumentation"'
            }
        });
        const response = await fetch('http://example.org');

        let result = {};
        const metadataHandler = new MetadataHandler({
            metadataCallback: (metadata) => result = metadata,
            apiClient: client,
            followDocumentationLink: false
        });
        metadataHandler.subjectURLs.push(response.url);
        metadataHandler.onFetch(response);
        metadataHandler.onEnd();

        const expected = {
            apiDocumentation: 'http://example.org/apidocumentation'
        }

        expect(result).toEqual(expected);
    });

    it('should return metadata if there is found', async () => {
        const doc = {
            "@context": [
                "http://www.w3.org/ns/hydra/context.jsonld",
                "https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/1.1/dcat-ap_1.1.jsonld",
                {
                    "hydra": "http://www.w3.org/ns/hydra/core#",
                    "dc": "http://purl.org/dc/terms/",
                    "dcat": "https://www.w3.org/ns/dcat#",
                    "hydra:apiDocumentation": {"@type": "@id"}
                }
            ],
            "@id": "/api",
            "@type": ["EntryPoint", "Distribution"],
            "hydra:apiDocumentation": "/api/documentation",
            "dc:issued": "2016-01-10",
            "dc:modified": "2018-07-24"
        };

        let result = {};
        const metadataHandler = new MetadataHandler({
            metadataCallback: (metadata) => result = metadata,
            apiClient: client,
            followDocumentationLink: false
        });

        metadataHandler.subjectURLs.push('http://example.org/api');

        stream = new parser.Impl(stringToStream(JSON.stringify(doc)), {baseIRI: 'http://example.org'});
        stream.on('data', quad => {
            metadataHandler.onQuad(quad);
        })

        await new Promise((resolve => stream.on('end', resolve)));

        metadataHandler.onEnd();

        const expected = {
            apiDocumentation: 'http://example.org/api/documentation',
            apiIssued: '2016-01-10',
            apiModified: '2018-07-24'
        }

        expect(result).toEqual(expected);
    });
});
