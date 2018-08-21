"use strict";
exports.__esModule = true;
var ApiClient_1 = require("./ApiClient");
var FullTextSearchHandler_1 = require("./FullTextSearchHandler");
try {
    //TODO : add your code snippet here
    var client = new ApiClient_1.ApiClient(null);
    var test_1 = new FullTextSearchHandler_1.FullTextSearchHandler({
        querystring: '?test123=OK&test456=OK',
        callback: function (test) { }
    });
    client.fetch('http://localhost:3001/api', [test_1]);
}
catch (e) {
    console.log(e);
}
