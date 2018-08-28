import {ApiClient} from "../lib/ApiClient";
import {CRUDHandler} from "../lib/CRUDHandler";
import {FullTextSearchHandler} from "../lib/FullTextSearchHandler";
import {VersioningHandler} from "../lib/VersioningHandler";
import {LanguageHandler} from "../lib/LanguageHandler";
import {PaginationHandler} from "../lib/PaginationHandler";
import {Readable} from "stream";
import {MetadataApiHandler} from "../lib/MetadataApiHandler";
const RDF = require('rdf-ext');
const JsonLdParser = require('rdf-parser-jsonld');
const N3Parser = require('rdf-parser-n3');
const stringToStream = require('string-to-stream');
const formats = require('rdf-formats-common')(RDF);
const stream = require('stream');
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fetchMock = require('fetch-mock');

describe('Generic Hypermedia API', () => {

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

    describe('The MetadataApiHandler module', () => {
        let client: ApiClient;
        let stream: Readable;
        let parser: any;

        beforeEach(() => {
            client = new ApiClient({});
            parser = formats.parsers.find('application/ld+json');
            fetchMock.restore();
        });

        afterEach( () => {
            if(stream){
                stream.unshift(null);
            }
        })

        it('should be a MetadataApiHandler constructor', () => {
            expect(new (<any> MetadataApiHandler)({ metadataCallback: (metadata) => {}, apiClient: client, followDocumentationLink: true}))
                .toBeInstanceOf(MetadataApiHandler);
        });

        it('should throw an error if no metadataCallback was given', () => {
            expect(() => { (<any> MetadataApiHandler)({apiClient: client})}).toThrow();
        });

        it('should throw an error if no apiClient was given', () => {
            expect( () => { (<any> MetadataApiHandler)({metadataCallback: (metadata) => {} })}).toThrow();
        });

        //TODO : test onFetch

        it('should return metadata if there is found and NOT follow the documentation link if found', async () => {
            const doc = {
                "@context": [
                    "http://www.w3.org/ns/hydra/context.jsonld",
                    "https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/1.1/dcat-ap_1.1.jsonld",
                    {
                        "hydra": "http://www.w3.org/ns/hydra/core#",
                        "dc": "http://purl.org/dc/terms/",
                        "dcat": "https://www.w3.org/ns/dcat#",
                        "hydra:apiDocumentation" : { "@type" : "@id"}
                    }
                ],
                "@id": "/api",
                "@type": ["EntryPoint", "Distribution"],
                "hydra:apiDocumentation": "/api/documentation",
                "dc:issued": "2016-01-10",
                "dc:modified": "2018-07-24"
            };

            let result = {};
            const metadataHandler = new MetadataApiHandler({
                metadataCallback: (metadata) => result = metadata,
                apiClient: client,
                followDocumentationLink: false
            });

            //TODO: find other way to do this.
            metadataHandler.subjectURLs.push('http://example.org/api');

            stream = new parser.Impl(stringToStream(JSON.stringify(doc)), {baseIRI: 'http://example.org'});
            stream.on('data', quad => {
                metadataHandler.onQuad(quad);
            })

            await new Promise( (resolve => stream.on('end', resolve)));

            metadataHandler.onEnd();

            const expected = {
                apiDocumentation: 'http://example.org/api/documentation',
                apiIssued: '2016-01-10',
                apiModified: '2018-07-24'
            }

            expect(result).toEqual(expected);
        });

        it('should return metadata if there is found and follow the documentation link if found', () => {
            //TODO
        });
    });

    describe('The PaginationHandler module', () => {
        let client: ApiClient;
        let stream: Readable;
        let parser: any;

        beforeEach(() => {
            client = new ApiClient({});
            parser = formats.parsers.find('application/ld+json');
            fetchMock.restore();
        });

        afterEach( () => {
            if(stream){
                stream.unshift(null);
            }
        });

        it('should be a PaginationHandler constructor', () => {
            expect(new (<any> PaginationHandler)({pagedataCallback: (pagedata) => {}, subjectStream: client.subjectStream})).toBeInstanceOf(PaginationHandler);
        })

        it('should throw an error if no arguments were given', () => {
            expect( () => { (<any> PaginationHandler)({})}).toThrow();
        })

        it('should extract info from the Link header if present', async () => {
            fetchMock.get('http://google.com', {
                status: 200,
                headers: {
                    'link' : '<https://google.com/api/resource?page=4&limit=100>; rel="next"'
                }
            });
            const response = await fetch('http://google.com');

            let result = {};
            const paginationHandler = new PaginationHandler({
                pagedataCallback: (data) => {result = data},
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
                pagedataCallback: (pagedata) => { result = pagedata },
                subjectStream: client.subjectStream
            });
            paginationHandler.subjectURLs.push('http://example.org/api/pagination');

            stream = new parser.Impl(stringToStream(JSON.stringify(doc)), {baseIRI: 'http://example.org'});
            stream.on('data', quad => {
                paginationHandler.onQuad(quad);
            })

            await new Promise( (resolve => stream.on('end', resolve)));
            paginationHandler.onEnd();

            const expected = {
                first: null,
                last: null,
                next: 'http://example.org/api/resource?page=4',
                prev: 'http://example.org/api/resource?page=2'
            };
            expect(result).toEqual(expected);
        })

    });

    describe('The LanguageHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
            fetchMock.restore();
        });

        it('should be a LanguageHandler constructor', () => {
            expect(new (<any> LanguageHandler)({languageCallback: (languageData) => {}, acceptLanguageHeader: 'nl-BE'})).toBeInstanceOf(LanguageHandler);
        });

        it('should throw an error if no arguments were given', () => {
            expect( () => { (<any> LanguageHandler)({})}).toThrow();
        })

        //TODO : test onFetch
        it('should throw an error if server does not support the requested languages', async () => {
            const data = {test: '1234'};
            fetchMock.get('http://google.com', {
                status: 400
            });
            const response = await fetch('http://google.com');

            const languageHandler = new LanguageHandler({
                languageCallback: data => {},
                acceptLanguageHeader: 'nl'
            });
            languageHandler.onFetch(response);
            expect( () => languageHandler ).toThrow();
        });

        it('should extract the by server chosen language from the Content-Language header', async () => {
            fetchMock.get('http://example.org', {
                status: 200,
                headers: {
                    'content-language' : 'en'
                }
            });
            const response = await fetch('http://example.org');

            let language = '';
            const languageHandler = new LanguageHandler({
                languageCallback: async data => {
                    data.stream.on('data', (data) => {
                        language = data;
                    })
                },
                acceptLanguageHeader: 'en;q=0.9,fr;q=0.6'
            });
            languageHandler.onFetch(response);

            //We have to wait for the stream to stop
            expect(language).toEqual('en');
        });


        //TODO : test onQuad --> stream
    });

    describe('The VersioningHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
            fetchMock.restore();
        });

        it('should be a VersioningHandler constructor', () => {
            expect(new (<any> VersioningHandler)({versionCallback: (versionData) => {}, apiClient: client, datetime: new Date(2018, 8, 24), followLink: false}))
                .toBeInstanceOf(VersioningHandler);
        })

        it('should throw an error if no arguments were given', () => {
            expect( () => { (<any> VersioningHandler)({})}).toThrow();
        })

        //TODO : test onFetch
        it('should extract the versioned URL from the Link header is the Memento-Datetime header is present', async () => {
            const date = new Date(2018, 8, 28, 10, 30);
            fetchMock.get('http://example.org', {
                status: 200,
                headers: {
                    'memento-datetime' : date,
                    'link' : '<http://example.org/earlierVersion>; rel="timegate"'
                }
            });
            const response = await fetch('http://example.org');

            let versionURL = '';
            const versioningHandler = new VersioningHandler({
                versionCallback: versionData => {
                    versionData.stream.on('data', data => {
                        versionURL = data;
                    })
                },
                datetime: date,
                followLink: false,
                apiClient: client
            });
            versioningHandler.onFetch(response);

            //Wait for stream in callback to stop
            expect(versionURL).toBe('http://example.org/earlierVersion');

        });

        it('should extract the versioned URL from the Link header if present and no Memento-Datetime header is present', async() => {
            fetchMock.get('http://example.org', {
               status: 200,
               headers : {
                   'link' : '<http://example.org/earlierVersion>; rel="alternate"'
               }
            });
            const response = await fetch('http://example.org');

            let versionURL = '';
            let date = new Date(2018, 8, 28, 10, 30);
            const versioningHandler = new VersioningHandler({
                versionCallback: versionData => {
                    versionData.stream.on('data', data => {
                        versionURL = data;
                    })
                },
                datetime: date,
                followLink: false,
                apiClient: client
            });
            versioningHandler.onFetch(response);
        });

        it('should throw an error if no Memento-Datetime and Link header are present', async () => {
           fetchMock.get('http://example.org', {
               status: 200
           });
           const response = await fetch('http://example.org');

            let versionURL = '';
            let date = new Date(2018, 8, 28, 10, 30);
            const versioningHandler = new VersioningHandler({
                versionCallback: versionData => {},
                datetime: date,
                followLink: false,
                apiClient: client
            });
            versioningHandler.onFetch(response);

            expect( () => versioningHandler).toThrow();
        });

        //TODO : test onQuad --> stream
    })

    describe('The FullTextSearchHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        it('should be a FullTextSearchHandler constructor without queryKeys', () => {
            expect(new (<any> FullTextSearchHandler)({callback: (data) => {}, apiClient: client, queryValues: ['Bob']})).toBeInstanceOf(FullTextSearchHandler);
        });

        it('should be a FullTextSearchHandler constructor with queryKeys', () => {
            expect(new (<any> FullTextSearchHandler)({callback: (data) => {}, apiClient: client, queryValues: ['Bob'], queryKeys: ['Naam']})).toBeInstanceOf(FullTextSearchHandler);
        });

        it('should throw an error if no arguments were given', () => {
            expect( () => { (<any> FullTextSearchHandler)({})}).toThrow();
        });

        //TODO: onQuad --> stream

    })

    describe('The CRUDHandler module', () => {
        let client: ApiClient;
        let stream: Readable;
        let parser: any;

        beforeEach(() => {
            client = new ApiClient({});
            parser = formats.parsers.find('application/ld+json');
            fetchMock.restore();
        });

        afterEach( () => {
            if(stream){
                stream.unshift(null);
            }
        })

        it('should be a CRUDHandler constructor', () => {
            expect(new (<any> CRUDHandler)({crudCallback: (crudData) => {}})).toBeInstanceOf(CRUDHandler);
        })

        it('should throw an error if no arguments were given', () => {
            expect( () => { (<any> CRUDHandler)({})}).toThrow();
        })

        it('should extract the possible operations from the Allow header if present', async () => {
            fetchMock.get('http://example.org', {
                status: 200,
                headers: {
                    'allow' : 'GET,POST'
                }
            });
            const response = await fetch('http://example.org');
            let operations = [];
            const crud = new CRUDHandler({
                crudCallback: data => operations = data
            });
            crud.onFetch(response);
            crud.onEnd();

            const expected = [ { method: 'GET'}, { method: 'POST'} ];

            expect(operations).toEqual(expected);

        });

        //Error: Unhandled "error' event. TypeError: Cannot read property 'termType' of undefined
        it('should return the possible CRUD operations if found', async () => {
            const doc = {
                "@context": [
                    "http://www.w3.org/ns/hydra/context.jsonld",
                    {
                        "sh": "http://www.w3.org/ns/shacl#",
                        "schema": "https://schema.org/"
                    }
                ],
                "@id": "/api/crud/1",
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

            let result = {};
            const crud = new CRUDHandler({
                crudCallback: (operations) => result = operations
            });

            stream = new parser.Impl(stringToStream(JSON.stringify(doc)), {baseIRI: 'http://example.org'});
            stream.on('data', quad => {
                crud.onQuad(quad);
            });

            await new Promise( (resolve => stream.on('end', resolve)));
            crud.onEnd();

            const expected = [
                { method: 'GET'},
                { expects: 'https://schema.org/Event', method: 'PUT'},
                { expects: 'https://schema.org/Event', method: 'POST' }
            ]

            expect(result).toEqual(expected);

        })
    })
});