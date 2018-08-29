import {MetadataHandler} from "../lib/MetadataHandler";
import {ApiClient} from "../lib/ApiClient";
import {PaginationHandler} from "../lib/PaginationHandler";
import {LanguageHandler} from "../lib/LanguageHandler";
import {VersioningHandler} from "../lib/VersioningHandler";
import {version} from "punycode";
import {FullTextSearchHandler} from "../lib/FullTextSearchHandler";
import {CRUDHandler} from "../lib/CRUDHandler";
import {IApiHandler} from "../lib/IApiHandler";

const minimist = require('minimist');

process.argv.splice(0, 2);
const args = minimist(process.argv);

let handlers = [];

if (args._.length < 2 || args._.length > 7 || args.h || args.help) {
    // Print command usage
    process.stderr.write(`
    generic-hypermedia-api-client requires an URL and one or more handlers
    
    Usage:    
    generic-hypermedia-api-client http://example.org handler1 handler2
    
    Handlers:
        * metadata
        * pagination
        * language
        * versioning
        * full_text_search
        * crud
    
    Options:
        --followdoclink         follow the documentation link in the MetadataHandler
        --followversionlink     follow the versioned URL in the VersionHandler
        --help                  print this help message
`);
    process.exit(1);
}

function createHandlers(client: ApiClient): Array<IApiHandler> {
    let handlers = [];
    try {
        for(let i = 1 ; i < args._.length ; i++){
            switch (args._[i]) {
                case 'metadata':
                    let followDocLink = false;
                    if(args.followdoclink){
                        followDocLink = true;
                    }
                    handlers.push(new MetadataHandler({
                        metadataCallback: (metadata) => console.log(metadata),
                        apiClient: client,
                        followDocumentationLink: followDocLink
                    }));
                    break;

                case 'pagination':
                    handlers.push(new PaginationHandler({
                        pagedataCallback: (pagedata) => console.log(pagedata),
                        subjectStream: client.subjectStream
                    }));
                    break;

                case 'language':
                    handlers.push(new LanguageHandler({
                        languageCallback: (languagedata) => {
                            languagedata.stream.on('data', data => {
                                console.log(data);
                            });
                        },
                        acceptLanguageHeader: 'en'
                    }));
                    break;

                case 'versioning':
                    let followVersionLink = false;
                    if(args.followversionlink){
                        followVersionLink = true
                    }
                    handlers.push(new VersioningHandler({
                        versionCallback: (versiondata) => {
                            versiondata.stream.on('data', data => {
                                console.log(data);
                            });
                        },
                        apiClient: client,
                        datetime: new Date(),
                        followLink: followVersionLink
                    }));
                    break;

                case 'full_text_search':
                    handlers.push(new FullTextSearchHandler({
                        callback: (ftsdata) => {
                            ftsdata.stream.on('data', data => {
                                console.log(data);
                            })
                        },
                        apiClient: client,
                        fetchQueryURL: false
                    }));
                    break;

                case 'crud':
                    handlers.push(new CRUDHandler({
                        crudCallback: (cruddata) => {
                            console.log(cruddata);
                        }
                    }))
            }
        }
    } catch (error) {
        process.stderr.write(error.message + '\n');
        process.exit(1);
    }

    return handlers;
}

function processURL(): void {
    const URL = args._[0];
    const client = new ApiClient(null);
    try {
        let handlers = createHandlers(client);
        client.fetch(URL, handlers);
    } catch (error) {
        process.stderr.write(error.message + '\n');
        process.exit(1);
    }
}

processURL();