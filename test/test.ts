import {ApiClient} from "../lib/ApiClient";
import {MetadataApiHandler} from "../lib/MetadataApiHandler";
import {PaginationHandler} from "../lib/PaginationHandler";
import {LanguageHandler} from "../lib/LanguageHandler";
import {VersioningHandler} from "../lib/VersioningHandler";
import {FullTextSearchHandler} from "../lib/FullTextSearchHandler";
import {CRUDHandler} from "../lib/CRUDHandler";



describe('Generic Hypermedia API', () => {

    describe('The ApiClient module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        it('should be an ApiClient constructor', () => {
            expect(new (<any> ApiClient)({})).toBeInstanceOf(ApiClient);
        })

        //MOCKUP FOR FETCH METHOD
    });

    describe('The MetadataApiHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        it('should be a MetadataApiHandler constructor', () => {
            expect(new (<any> MetadataApiHandler)({ metadataCallback: (metadata) => {}, apiClient: client, followDocumentationLink: true}))
                .toBeInstanceOf(MetadataApiHandler);
        });
    })

    describe('The PaginationHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        it('should be a PaginationHandler constructor', () => {
            expect(new (<any> PaginationHandler)({pagedataCallback: (pagedata) => {}, subjectStream: client.subjectStream})).toBeInstanceOf(PaginationHandler);
        })

    });

    describe('The LanguageHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        it('should be a LanguageHandler constructor', () => {
            expect(new (<any> LanguageHandler)({languageCallback: (languageData) => {}, acceptLanguageHeader: 'nl-BE'})).toBeInstanceOf(LanguageHandler);
        });
    });

    describe('The VersioningHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        it('should be a VersioningHandler constructor', () => {
            expect(new (<any> VersioningHandler)({versionCallback: (versionData) => {}, apiClient: client, datetime: new Date(2018, 8, 24)}))
                .toBeInstanceOf(VersioningHandler);
        })
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
        })
    })

    describe('The CRUDHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        it('should be a CRUDHandler constructor', () => {
            expect(new (<any> CRUDHandler)({crudCallback: (crudData) => {}})).toBeInstanceOf(CRUDHandler);
        })
    })
});