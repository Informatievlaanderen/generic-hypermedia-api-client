import {ApiClient} from "../lib/ApiClient";
import {MetadataApiHandler} from "../lib/MetadataApiHandler";

//FAIL: TypeScript compiler encountered syntax errors while transpiling. Errors: ',' expected.,'finally' expected.
test('ApiClient constructor', () => {
    const client = new ApiClient({});
    expect(client).toBeInstanceOf(ApiClient);
});

describe('Generic Hypermedia API', () => {

    describe('The ApiClient module', () => {

        it('should be an ApiClient constructor', () => {
            expect(new (<any> ApiClient)({})).toBeInstanceOf(ApiClient);
        });

        //Extra  tests?

    })

    describe('An ApiClient instance', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        //MOCKUP FOR FETCH METHOD
    });

    describe('The MetadataApiHandler module', () => {
        let client: ApiClient;

        beforeEach(() => {
            client = new ApiClient({});
        });

        it('should be a MetadataApiHandler constructor', () => {
            expect(new (<any> MetadataApiHandler)({ metadataCallback: (metadata) => {}, apiClient: client, subjectStream: client.subjectStream, followDocumentationLink: true}))
                .toBeInstanceOf(MetadataApiHandler);
        });
    })
});