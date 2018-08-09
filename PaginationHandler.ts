import {IApiHandler} from "./IApiHandler";

interface IPaginationHandlerArgs {
    pagedataCallback: () => any;
    subjectStream: NodeJS.ReadableStream;
}

export class PaginationHandler implements IApiHandler {
    private pagedataCallback: any;

    private subjectURLs: Array<string>;
    private myTriples: {[key: string]: {} } = {};
    private subjectPageData: {[key: string]: {} } = {};

    private pagedataFields: Array<string> = ['first', 'next', 'last', 'previous'];
    // private next: string;   //If present, will be found in body of first fetch URL
    // private last: string;
    // private first: string;
    // private prev: string;   //If present, will be found in body of first fetch URL

    constructor(args: IPaginationHandlerArgs){
        this.pagedataCallback = args.pagedataCallback;

        this.subjectURLs = [];
        args.subjectStream.on('data', (url) => {
            this.subjectURLs.push(url);
        });
    }

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
        let urlMatched = false;
        for(let index in this.subjectURLs){
            const subjectURL = this.subjectURLs[index];
            if(quad.subject.value === subjectURL){
                urlMatched = true;
                for(let subjectValue in this.myTriples){
                    //If there's already data for the URL, move it to the subjectPageData
                    if(subjectValue === subjectURL){
                        const data = this.myTriples[subjectValue];
                        Object.keys(data).forEach( (key) => {
                            this.subjectPageData[key] = {objectValue: data[key], priority: index};
                        });
                        delete this.myTriples[subjectValue];
                    }
                }

                //Process the quad and add its info to the subjectPageData
                this.checkPredicates(quad, (pagedata) => {
                    Object.keys(pagedata).forEach( (key) => {
                        const pageDataPart = this.subjectPageData[key];
                        if(!pageDataPart || pageDataPart["priority"] > index){
                            this.subjectPageData[key] = {objectValue: pagedata[key], priority: index}
                        }
                    })
                })
            }
        }

        //The URL has not been discovered (yet)
        if(!urlMatched){
            this.checkPredicates(quad, (pagedata) => {
                Object.keys(pagedata).forEach( (key) => {
                    if(!this.myTriples[quad.subject.value]){
                        this.myTriples[quad.subject.value] = {};
                    }
                    this.myTriples[quad.subject.value][key] = pagedata[key];
                })
            })
        }
    }

    checkPredicates(quad: RDF.Quad, dataCallback: () => any){
        let match = {};
        if(quad.predicate.value === 'http://www.w3.org/ns/hydra/core#first'){
            match["first"] = quad.object.value;
        }
        if(quad.predicate.value === 'http://www.w3.org/ns/hydra/core#next'){
            match["next"] = quad.object.value;
        }

        if(quad.predicate.value === 'http://www.w3.org/ns/hydra/core#previous'){
            match["previous"] = quad.object.value;
        }

        if(quad.predicate.value === 'http://www.w3.org/ns/hydra/core#last'){
            match["last"] = quad.object.value;
        }

        dataCallback(match);
    }

    onEnd() {
        let pagedataObject = {};
        for(let index in this.pagedataFields){
            if(this.subjectPageData[this.pagedataFields[index]] == undefined){
                pagedataObject[this.pagedataFields[index]] = null;
            } else {
                pagedataObject[this.pagedataFields[index]] = this.subjectPageData[this.pagedataFields[index]]['objectValue'];
            }
        }

        this.pagedataCallback(pagedataObject);
    }
}