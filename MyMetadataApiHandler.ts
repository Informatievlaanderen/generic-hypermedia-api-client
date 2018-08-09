import {IApiHandler} from "./IApiHandler";
import {ApiClient} from "./ApiClient";

export interface IMetadataHandlerArgs {
    metadataCallback: () => any;
    apiClient: ApiClient;
    subjectStream: NodeJS.ReadableStream;
    followDocumentationLink?: boolean;
}

export class MyMetadataApiHandler implements IApiHandler {

    private metadataCallback: any;
    private apiClient: ApiClient;
    private followDocLink: boolean; /*Boolean that indicates if a found documentation link has to be fetched*/

    private subjectURLs : Array<string>; /*Array with potential subjectURLs that need to be checked*/
    private myTriples: {[key: string]: {} } = {};
    private subjectMetadata: {[key: string]: {} } = {};

    private metadataFields: Array<string> = ['apiDocumentation', 'apiTitle', 'apiContactName', 'apiContactEmail', 'apiContactPhoneNumber', 'temporal', 'spatial'];

    constructor(args: IMetadataHandlerArgs){
        this.metadataCallback = args.metadataCallback;
        this.apiClient = args.apiClient;
        this.followDocLink = args.followDocumentationLink;

        this.subjectURLs = [];
        //Listener for subjectstream from client.
        //Every time a new url is added to the stream, the fetch method from the client with this new url is executed.
        args.subjectStream.on('data', (url) => {
            this.subjectURLs.push(url);
        });
    }

    onFetch(response: Response) {
        //Check the header, and check its API documentation link.
        if(response.headers.get('link') != null){
            let link = response.headers.get('link').split(';')[0];
            this.apiDocumentation = link.substr(1, link.length-2);
        }
    }

    onQuad(quad: RDF.Quad) {
        let urlMatched = false;

        for(let index in this.subjectURLs){
            let subjectURL = this.subjectURLs[index];

            if(quad.subject.value === subjectURL){
                urlMatched = true;
                // Check if there's already data for this URL in myTriples
                for(let subjectValue in this.myTriples){
                    if(subjectURL === subjectValue){
                        //Move metadata part from myTriples to subject_metadata
                        const data = this.myTriples[subjectValue];
                        Object.keys(data).forEach( (key) => {
                            this.subjectMetadata[key] = { objectValue: data[key], priority: index};
                        });
                        delete this.myTriples[subjectValue];
                    }
                }

                // Process the quad and if there is a match, add it to the SUBJECT_METADATA
                this.checkPredicates( quad,(metadata) => {
                    Object.keys(metadata).forEach( (key) => {
                        const metadataPart = this.subjectMetadata[key];
                        //Only add to subject_metadata is this part of data is new or has a lower (thus more important) priority
                        if(!metadataPart || metadataPart["priority"] > index){
                            if(key === 'apiDocumentation'){
                                this.subjectMetadata[key] = {objectValue: metadata[key], priority: 0};
                            } else {
                                this.subjectMetadata[key] = {objectValue: metadata[key], priority: index+1};
                            }
                        }
                    })
                });
            }
        }

        //Process quad and put matches in myTriples
        if(!urlMatched){
            this.checkPredicates(quad, (metadata) => {
                Object.keys(metadata).forEach( (key) => {
                    if(!this.myTriples[quad.subject.value]){
                        this.myTriples[quad.subject.value] = {};
                    }
                    this.myTriples[quad.subject.value][key] = metadata[key];
                })
            })
        }
    }

    checkPredicates(quad: RDF.Quad, dataCallback: () => any){
        let match = {};
        if(quad.predicate.value === 'http://www.w3.org/ns/hydra/core#apiDocumentation'){
            match["apiDocumentation"] = quad.object.value;
            if(this.followDocLink){
                this.apiClient.fetch(quad.object.value, [this]);
                this.apiClient.subjectStream.unshift(quad.object.value);
                this.followDocLink = false;
            }
        }

        if(quad.predicate.value === 'http://purl.org/dc/terms/title'){
            match["apiTitle"] = quad.object.value;
        }

        if(quad.predicate.value === 'http://xlmns.com/foaf/0.1/name'){
            match["apiContactName"] = quad.object.value;
        }

        if(quad.predicate.value === 'http://schema.org/email'){
            match["apiContactEmail"] = quad.object.value;
        }

        if(quad.predicate.value === 'http://schema.org/telephone'){
            match["apiContactPhoneNumber"] = quad.object.value;
        }

        if(quad.predicate.value === 'http://purl.org/dc/terms/temporal'){
            match["temporal"] = quad.object.value;
        }

        if(quad.predicate.value === 'http://purl.org/dc/terms/spatial'){
            match["spatial"] = quad.object.value;
        }

        dataCallback(match);
    }

    // TODO: this metadatacallback is for emitting _all_ metadata at once,
    // but if we want, we could have separate callbacks for each metadata type,
    // then we could potentially invoke the callback much sooner.
    onEnd() {
        //Emit all discovered metadata in the callback
        let metadataObject = {};
        for(let index in this.metadataFields){
            if(this.subjectMetadata[this.metadataFields[index]] == undefined){
                metadataObject[this.metadataFields[index]] = null;
            } else {
                metadataObject[this.metadataFields[index]] = this.subjectMetadata[this.metadataFields[index]]['objectValue'];
            }
        }

        this.metadataCallback(metadataObject);

    }

}