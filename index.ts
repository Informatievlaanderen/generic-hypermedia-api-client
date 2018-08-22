import {LanguageHandler} from "./lib/LanguageHandler";
import {ApiClient} from "./lib/ApiClient";
import {MetadataApiHandler} from "./lib/MetadataApiHandler";
import {PaginationHandler} from "./lib/PaginationHandler";
import {VersioningHandler} from "./lib/VersioningHandler";
import {type} from "os";
import {FullTextSearchHandler} from "./lib/FullTextSearchHandler";


try {
    //TODO : add your code snippet here
    const client = new ApiClient(null);
    const test = new MetadataApiHandler({
        metadataCallback: (callback) => {console.log(callback)},
        apiClient: client,
        followDocumentationLink: false,
        subjectStream: client.subjectStream
    });

    client.fetch('http://localhost:3001/api', [test]);
} catch(e){
    console.log(e);
}

