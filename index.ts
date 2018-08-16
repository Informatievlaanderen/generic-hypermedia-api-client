import {LanguageHandler} from "./LanguageHandler";
import {ApiClient} from "./ApiClient";
import {MyMetadataApiHandler} from "./MyMetadataApiHandler";
import {PaginationHandler} from "./PaginationHandler";
import {VersioningHandler} from "./VersioningHandler";

//TEST PROGRAM

//https://datapiloten.be/parking/catalog.ttl
//https://graph.irail.be/sncb/connections
//http://localhost:3001/api

try {
    const client = new ApiClient(null);

    client.fetch('http://localhost:3001/api',
        [
            new MyMetadataApiHandler(
                {
                    metadataCallback: (metadata) => console.log(metadata),
                    apiClient: client,
                    followDocumentationLink: true,
                    subjectStream: client.subjectStream
                }
            )/*,
            new PaginationHandler(
                {
                    pagedataCallback: (pagedata) => console.log(pagedata),
                    subjectStream: client.subjectStream
                }
            ),
            new LanguageHandler(
                {
                    languageCallback: (language) => {
                        language.stream.on('data', (data) => {
                            if (typeof data == 'object') {
                                console.log(data.object.value);
                            } else {
                                console.log(data);
                            }
                        })
                    },
                    acceptLanguageHeader: 'nl'
                }
            ),
            new VersioningHandler({
                versionCallback: version => {
                    version.stream.on('data' , () => {
                        console.log('');
                    })
                },
                datetime: new Date(2018, 8, 14 )
            })*/
        ]
    );
}