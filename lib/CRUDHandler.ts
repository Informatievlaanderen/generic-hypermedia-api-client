import {IApiHandler} from "./IApiHandler";
import * as RDF from "rdf";
import {namedNode} from "@rdfjs/data-model";
import * as RdfTerm from "rdf-string";

interface ICrudHandlerArgs {
    crudCallback: (data) => void;
}

export class CRUDHandler implements IApiHandler {

    private static readonly HYDRA_OPERATION = namedNode('http://www.w3.org/ns/hydra/core#operation');
    private static readonly HYDRA_EXPECTS = namedNode('http://www.w3.org/ns/hydra/core#expects');
    private static readonly HYDRA_METHOD = namedNode('http://www.w3.org/ns/hydra/core#method');

    private crudCallback: (data) => void;

    private crudOperations: { [key: string]: {} } = {}; //Result object
    private unidentifiedQuads: Array<object> = [];  //Quads whose subject was not discovered yet
    private nodeQuads: Array<Object> = [];  //Quads who have an object that is not a Literal

    private responseURL: RDF.NamedNode;

    constructor(args: ICrudHandlerArgs){
        this.crudCallback = args.crudCallback;
    }

    onFetch(response: Response) {
        if(response.headers.has('Allow')){
            const operations = response.headers.get('Allow').split(',');
            if(operations.length > 0){
                for(let index in operations){
                    this.crudOperations[operations[index].trim()] = {};
                }
            }
        }

        this.responseURL = namedNode(response.url);
    }

    onQuad(quad: RDF.Quad) {
        this.checkPredicates(quad, (data) => {
            if(Object.keys(data).length > 0){
                const key = Object.keys(data)[0];
                if(this.nodeQuads.indexOf(RdfTerm.termToString(quad.subject)) >= 0){
                    if(!this.crudOperations[RdfTerm.termToString(quad.subject)]){
                        this.crudOperations[RdfTerm.termToString(quad.subject)] = {};
                    }

                    if(!this.crudOperations[RdfTerm.termToString(quad.subject)][key]){
                        this.crudOperations[RdfTerm.termToString(quad.subject)][key] = data[key]
                    }
                } else {
                    if(!this.unidentifiedQuads[RdfTerm.termToString(quad.subject)]){
                        this.unidentifiedQuads[RdfTerm.termToString(quad.subject)] = {};
                    }
                    this.unidentifiedQuads[RdfTerm.termToString(quad.subject)][key] = data[key];
                }
            }
        });
    }

    checkPredicates(quad: RDF.Quad, dataCallback: (data) => void) {
        let match = {};

        if(quad.predicate.equals(CRUDHandler.HYDRA_OPERATION) && quad.subject.equals(this.responseURL)){
            this.nodeQuads.push(RdfTerm.termToString(quad.object));
        }

        if(quad.predicate.equals(CRUDHandler.HYDRA_METHOD)){
            match['method'] = quad.object.value;
        }

        if(quad.predicate.equals(CRUDHandler.HYDRA_EXPECTS)){
            match['expects'] = quad.object.value;
        }

        dataCallback(match);
    }

    onEnd() {
        //TODO : maybe do this also in the onQuad method?
        for(let subjectVal in this.unidentifiedQuads){
            if(this.nodeQuads.indexOf(subjectVal) >= 0){
                const crudObject = this.unidentifiedQuads[subjectVal];
                if(!this.crudOperations[subjectVal]){
                    this.crudOperations[subjectVal] = {};
                    this.crudOperations[subjectVal] = crudObject;
                } else {
                    Object.keys(crudObject).forEach( (key) => {
                        if(!this.crudOperations[subjectVal][key]){
                            this.crudOperations[subjectVal][key] = crudObject[key];
                        }
                    })
                }
                delete this.unidentifiedQuads[subjectVal];
            }
        }

        let resultArray = [];
        for(let subjectVal in this.crudOperations){
            resultArray.push(this.crudOperations[subjectVal]);
        }

        this.crudCallback(resultArray);
    }

}