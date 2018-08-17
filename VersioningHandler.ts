import {IApiHandler} from "./IApiHandler";
import {Readable} from "stream";

const parseLink = require('parse-link-header');

interface IVersionHandlerArgs {
    versionCallback: () => any;
    datetime?: Date;    //Maybe more specific format?
    version?: string;
}

export class VersioningHandler implements IApiHandler {

    private versionCallback: () => any;
    private datetime: Date;
    private version: string;

    private myQuads: {[key: string]: [] } = {};   //Key will be graph ID
    private versionFound: boolean;
    private graphID: string;

    private stream: NodeJS.ReadableStream;

    constructor(args: IVersionHandlerArgs){
        this.versionCallback = args.versionCallback;
        if(args.datetime && args.version){
            throw new Error('This building block requires either a datetime or a version identification, not both');
        }

        //If a datetime is given as parameter, it means TEMPORAL versioning. If a version ID is given, it means ATEMPORAL versioning.
        if(args.datetime || args.version){
            if(args.datetime){
                this.datetime = args.datetime;
            } else if(args.version){
                this.version = args.version;
            }
        }

        if(!args){
            throw new Error('Please give a datetime or versionID as parameter for this building block');
        }
        this.versionFound = false;
        this.stream = new Readable({ objectMode: true});
        this.stream._read = () => {};

        this.versionCallback({stream: this.stream});
    }

    onFetch(response: Response) {
        //We aksed for a time-negotiated response and received one
        if(this.datetime && response.headers && response.headers.has('memento-datetime')){
          this.stream.unshift(response.headers.get('memento-datetime'));
        } else if(this.version && response.status === 307){
            //We asked for a specific version of the content so we are being redirected
            //We need to fetch this redirected URL
            //TODO :

        } else {
            //We asked for a time-negotiated response or for a specific version, but didn't receive one of them
            //So we throw an error, because the server should do one of both.
            throw new Error('Server must at least respond with a memento-datetime or redirect URL');
        }
    }

    //TODO : check this method
    onQuad(quad: RDF.Quad) {
        //The quad with predicate prov:generatedAtTime or ver:relatedVersion has not been found yet, so store all triples in temporary object
        if(!this.versionFound){
            this.checkPredicates(quad, (data) => {
                if(Object.keys(data).length > 0){
                    if(!this.myQuads[quad.graph.value]){
                        this.myQuads[quad.graph.value] = [];
                    }
                    this.myQuads[quad.graph.value].push(data);

                }
            });
        } else{
            //The quad has been found and the graphID is kwown. So start streaming the triples.
            this.stream.unshift(this.myQuads[this.graphID]);
        }
    }

    checkPredicates(quad: RDF.Quad, dataCallback: () => any) {
        let triple = {};

        if(!this.versionFound){
            if(this.datetime  && quad.predicate.value == 'http://www.w3.org/ns/prov#generatedAtTime'){
                this.graphID = quad.subject.value;
                this.versionFound = true;
            } else if(this.version && quad.predicate.value == 'http://semweb.datasciencelab.be/ns/version/#relatedVersion'){
                //TODO
            } else {
                triple['subject'] = quad.subject;
                triple['predicate'] = quad.predicate;
                triple['object'] = quad.object;
            }
        } else {
            triple['subject'] = quad.subject;
            triple['predicate'] = quad.predicate;
            triple['object'] = quad.object;
        }

        dataCallback(triple);
    }

    onEnd() {
        this.stream.unshift(null);
    }

}