import {IApiHandler} from "./IApiHandler";

interface IPaginationHandlerArgs {
    pagedataCallback: () => any;
}

export class PaginationHandler implements IApiHandler {
    private pagedataCallback: any;

    private next: string;
    private last: string;
    private first: string;
    private prev: string;

    //TODO : use interface
    constructor(pagedataCallback: () => any){
        this.pagedataCallback = pagedataCallback;
    }
    /*constructor(args: IPaginationHandlerArgs){
        this.pagedataCallback = args.pagedataCallback();
    }*/

    onFetch(response: Response) {
        if(response.headers.get('link') !== null){
            let links = response.headers.get('link').split(',');
            for(let i = 0 ; i < links.length ; i++){
                let pieces = links[i].split(';');
                if(pieces[1].indexOf('prev') >= 0){
                    this.prev = pieces[0];
                } else if(pieces[1].indexOf('first') >= 0){
                    this.first = pieces[0];
                } else if(pieces[1].indexOf('last') >= 0){
                    this.last = pieces[0];
                } else if(pieces[1].indexOf('next') >= 0){
                    this.next = pieces[0];
                }
            }
        }
    }

    onQuad(quad: RDF.Quad) {
        if(quad.predicate.value === ('http' || 'https' ) + '://www.w3.org/ns/hydra/core#first'){
            this.first = quad.object.value;
        }
        if(quad.predicate.value === ('http' || 'https' )  + '://www.w3.org/ns/hydra/core#next'){
            this.next = quad.object.value;
        }

        if(quad.predicate.value === ('http' || 'https' ) + '://www.w3.org/ns/hydra/core#previous'){
            this.prev = quad.object.value;
        }

        if(quad.predicate.value === ('http' || 'https' )  + '://www.w3.org/ns/hydra/core#last'){
            this.last = quad.object.value;
        }
    }

    onEnd() {
        this.pagedataCallback({
            first: this.first,
            next: this.next,
            previous: this.prev,
            last: this.last
        });
    }
}