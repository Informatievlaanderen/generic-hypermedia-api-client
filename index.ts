import {LanguageHandler} from "./LanguageHandler";
import {ApiClient} from "./ApiClient";
import {MyMetadataApiHandler} from "./MyMetadataApiHandler";
import {PaginationHandler} from "./PaginationHandler";
import {VersioningHandler} from "./VersioningHandler";


//https://datapiloten.be/parking/catalog.ttl
//https://graph.irail.be/sncb/connections
//http://localhost:3001/api

try {
    //TODO : add your code snippet here
    const client = new ApiClient(null);
    const metadataHandler = new MyMetadataApiHandler({
        metadataCallback: (metadata) => console.log(metadata),
        apiClient: client,
        subjectStream: client.subjectStream,
        followDocumentationLink: true
    });

    const pagineringHandler = new PaginationHandler(
        {
            pagedataCallback: (pagedata) => console.log(pagedata),
            subjectStream: client.subjectStream
        }
    );

    const languageHandler = new LanguageHandler(
        {
            languageCallback: (language) => {
                language.stream.on('data', (data) => {
                    if (typeof data === 'object') {
                        console.log(data.object.value);
                    } else {
                        console.log(data);
                    }
                })
            },
            acceptLanguageHeader: 'nl,en;q=0.8'  //Supported languages on the server are nl, en and fr
        }
    )

    const versioningHandler = new VersioningHandler({
        versionCallback: version => {
            version.stream.on('data' , (data) => {
                console.log(data);
            })
        },
        apiClient: client,
        followLink: false,
        datetime: new Date(2018, 8, 14 )
    })
    client.fetch('http://localhost:3001/api', [ metadataHandler ]);
} catch(e){
    console.log(e);
}

