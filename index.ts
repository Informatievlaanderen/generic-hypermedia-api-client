import {LanguageHandler} from "./LanguageHandler";
import {ApiClient} from "./ApiClient";
import {MyMetadataApiHandler} from "./MyMetadataApiHandler";
import {PaginationHandler} from "./PaginationHandler";
import {VersioningHandler} from "./VersioningHandler";
import {type} from "os";
import {FullTextSearchHandler} from "./FullTextSearchHandler";


try {
    //TODO : add your code snippet here
    const client = new ApiClient(null);
    const fullTextSearch = new FullTextSearchHandler({
        callback: (callback) => {},
        apiClient: client,
        queryValues: ['key']
    })

    client.fetch('http://localhost:3001/api/personen', [fullTextSearch]);


} catch(e){
    console.log(e);
}

