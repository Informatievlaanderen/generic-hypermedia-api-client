import {ApiClient} from "../lib/ApiClient";
import {Readable} from "stream";
import {VersioningHandler} from "../lib/VersioningHandler";

require('es6-promise').polyfill();
require('isomorphic-fetch');
const fetchMock = require('fetch-mock');

describe('The VersioningHandler module', () => {
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

    it('should be a VersioningHandler constructor', () => {
        expect(new (<any> VersioningHandler)({
            versionCallback: (versionData) => {
            }, apiClient: client, datetime: new Date(2018, 8, 24), followLink: false
        }))
            .toBeInstanceOf(VersioningHandler);
    })

    it('should throw an error if no arguments were given', () => {
        expect(() => {
            (<any> VersioningHandler)({})
        }).toThrow();
    })


    it('should extract the versioned URL from the Link header is the Memento-Datetime header is present', async () => {
        const date = new Date(2018, 8, 28, 10, 30);
        fetchMock.get('http://example.org', {
            status: 200,
            headers: {
                'memento-datetime': date,
                'link': '<http://example.org/earlierVersion>; rel="timegate"'
            }
        });
        const response = await fetch('http://example.org');

        const data = await new Promise( resolve => {
            const versioningHandler = new VersioningHandler({
                versionCallback: versionData => {
                    versionData.stream.on('data', resolve);
                },
                datetime: date,
                followLink: false,
                apiClient: client
            });
            versioningHandler.onFetch(response);
        });

        expect(data).toBe('http://example.org/earlierVersion');

    });

    it('should extract the versioned URL from the Link header if present and no Memento-Datetime header is present', async () => {
        fetchMock.get('http://example.org', {
            status: 200,
            headers: {
                'link': '<http://example.org/earlierVersion>; rel="alternate"'
            }
        });
        const response = await fetch('http://example.org');

        const data = await new Promise((resolve) => {
            const versioningHandler = new VersioningHandler({
                versionCallback: versionData => {
                    versionData.stream.on('data', resolve)
                },
                datetime: new Date(2018, 8, 28, 10, 30),
                followLink: false,
                apiClient: client
            });

            versioningHandler.onFetch(response);
        });

        expect(data).toBe('http://example.org/earlierVersion');

    });

    it('should throw an error if no Memento-Datetime and Link header are present', async () => {
        fetchMock.get('http://example.org', {
            status: 200
        });
        const response = await fetch('http://example.org');

        let versionURL = '';
        let date = new Date(2018, 8, 28, 10, 30);
        const versioningHandler = new VersioningHandler({
            versionCallback: versionData => {
            },
            datetime: date,
            followLink: false,
            apiClient: client
        });
        expect(() => versioningHandler.onFetch(response)).toThrow();
    });
    
})