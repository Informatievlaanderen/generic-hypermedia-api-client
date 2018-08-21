import {IApiHandler} from "./IApiHandler";
import {Readable} from "stream";
import {namedNode} from "@rdfjs/data-model";

interface IFullTextSearchHandlerArgs {
    callback: () => any;
    querystring: string;
}

export class FullTextSearchHandler implements IApiHandler {

    private static readonly HYDRA_QUERY_TEMPLATE = namedNode('http://www.w3.org/ns/hydra/core#template');

    private callback: () => any;
    private querystring?: string;

    private stream: NodeJS.ReadableStream;

    constructor(args: IFullTextSearchHandlerArgs){
        this.callback = args.callback;
        this.querystring = args.querystring;

        this.stream = new Readable({ objectMode: true});
        this.stream._read = () => {};
        this.callback({stream: this.stream});
    }

    onFetch(response: Response) {
        //If there's an error, stop the stream.
        if(response.status === 400 || response.status === 404){
            this.stream.unshift(null);
        }
    }

    onQuad(quad: RDF.Quad) {
        //So if the client did not give a querystring in the constructor, we have to search in the body
        //for the Hydra query template
        if(!this.querystring){
            this.checkPredicates( quad, (data) => {
                if(data){
                    this.stream.unshift(data);
                }
            });
        }
    }

    checkPredicates(quad: RDF.Quad, dataCallback: () => any) {
        let template = '';
        if(quad.predicate.equals(FullTextSearchHandler.HYDRA_QUERY_TEMPLATE)){
            template = quad.object.value;
        }

        dataCallback(template);
    }

    onEnd() {
        this.stream.unshift(null);
    }



}