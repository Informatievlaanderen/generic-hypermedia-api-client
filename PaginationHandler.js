"use strict";
exports.__esModule = true;
var PaginationHandler = /** @class */ (function () {
    function PaginationHandler(args) {
        this.pagedataCallback = args.pagedataCallback;
    }
    PaginationHandler.prototype.onFetch = function (response) {
        if (response.headers.get('link') !== null) {
            var links = response.headers.get('link').split(',');
            for (var i = 0; i < links.length; i++) {
                var pieces = links[i].split(';');
                if (pieces[1].indexOf('prev') >= 0) {
                    this.prev = pieces[0];
                }
                else if (pieces[1].indexOf('first') >= 0) {
                    this.first = pieces[0];
                }
                else if (pieces[1].indexOf('last') >= 0) {
                    this.last = pieces[0];
                }
                else if (pieces[1].indexOf('next') >= 0) {
                    this.next = pieces[0];
                }
            }
        }
    };
    PaginationHandler.prototype.onQuad = function (quad) {
        if (quad.predicate.value === ('http' || 'https') + '://www.w3.org/ns/hydra/core#first') {
            this.first = quad.object.value;
        }
        if (quad.predicate.value === ('http' || 'https') + '://www.w3.org/ns/hydra/core#next') {
            this.next = quad.object.value;
        }
        if (quad.predicate.value === ('http' || 'https') + '://www.w3.org/ns/hydra/core#previous') {
            this.prev = quad.object.value;
        }
        if (quad.predicate.value === ('http' || 'https') + '://www.w3.org/ns/hydra/core#last') {
            this.last = quad.object.value;
        }
    };
    PaginationHandler.prototype.onEnd = function () {
        this.pagedataCallback({
            first: this.first,
            next: this.next,
            previous: this.prev,
            last: this.last
        });
    };
    return PaginationHandler;
}());
exports.PaginationHandler = PaginationHandler;
