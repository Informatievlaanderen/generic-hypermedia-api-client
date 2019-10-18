import {IApiHandler} from "./IApiHandler";
import {Readable} from "stream";
import * as RDF from "rdf";

interface ILanguageArgs {
    languageCallback: (data) => void;
    acceptLanguageHeader: string
}


export class LanguageHandler implements IApiHandler {

    private languageCallback: (data) => void;
    public acceptLanguageHeader: string;

    private acceptedLanguage: string;
    private quadStream: Readable;

    private streamIsStopped: boolean;

    constructor(args: ILanguageArgs){
        if(!args.acceptLanguageHeader || !args.languageCallback){
            throw new Error('(LanguageHandler): constructor expects 2 arguments');
        } else {
            this.languageCallback = args.languageCallback;
            this.acceptLanguageHeader = args.acceptLanguageHeader;

            //Create a Readable stream
            try {
                this.quadStream = new Readable({objectMode: true});
                this.quadStream._read = () => {
                };
                this.languageCallback({stream: this.quadStream});
                this.streamIsStopped = false;
            } catch (e) {
                this.streamIsStopped = true;
                throw new Error('[LanguageHandler]: ' + e);
            }
        }
    }

    onFetch(response: Response) {
        if(response.status === 200){
            this.acceptedLanguage = response.headers.get('content-language');
            if(this.acceptedLanguage){
                this.quadStream.unshift(this.acceptedLanguage);
            } else {
                this.streamIsStopped = true;
                this.quadStream.unshift(null);
            }
        } else {
            this.streamIsStopped = true;
            this.quadStream.unshift(null);
            throw new Error(response.url + " does not support the requested language(s)");
        }
    }

    onQuad(quad: RDF.Quad) {
        //Make sure that only literals in different language are filtered out.
        //IRIs (NamedNodes) and BlankNodes don't have a language, so we always push them in the stream.
        if(!this.streamIsStopped){
            if(quad.object.termType === 'Literal'){
                if(quad.object.language.toLowerCase() == this.acceptedLanguage.toLowerCase()){
                    this.quadStream.unshift(quad);
                }
            } else {
                this.quadStream.unshift(quad);
            }
        }
    }

    //Not needed
    checkPredicates(quad: RDF.Quad, dataCallback: (data) => void) {}


    onEnd() {
        this.quadStream.unshift(null);
    }

}