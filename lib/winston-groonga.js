"use strict";

var winston = require("winston"),
    common = require("winston/lib/winston/common"),
    cycle = require("cycle"),
    uuid = require("node-uuid"),
    util = require("util"),
    url = require("url"),
    http = require("http"),
    https = require("https"),
    _ = require("lodash"),
    url = require("url"),
    reqProt = http,
    Groonga,
    createQuery,
    postData,
    client,
    createUID,
    logMsgUID,
    groongaPath,
    createPath;

// ### function Groonga (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Console transport object responsible
// for making arbitrary HTTP requests whenever log messages and metadata
// are received.
Groonga = exports.Groonga = function (options) {
    this.name = "groonga";
    this.protocol = options.protocol || "http";
    if (options.protocol == "https") {
        reqProt = https;
    } else {
        reqProt = http;
    }
    this.url = options.url || "";
    this.host = options.host || "localhost";
    this.port = options.port || 1060;
    this.level = options.level || "info";
    this.table = options.table || "logs";
};

// Inherit from `winston.Transport`.
util.inherits(Groonga, winston.Transport);

// Expose the name of this Transport on the prototype
Groonga.prototype.name = "groonga";

// Define a getter so that `winston.transports.Groonga`
// is available and thus backwards compatible.
winston.Transport.Groonga = Groonga;

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
Groonga.prototype.log = function (level, msg, meta, callback) {
    var self,
        params;
    if (this.silent) {
        return callback && callback(null, true);
    }
    self = this;
    params = common.clone(cycle.decycle(meta)) || {};
    params.timestamp = (new Date().getTime() / 1000).toFixed(0);
    params.message = msg;
    params.level = level;
    createPath(this);
    createQuery(params, this);
};

// Creates and returns a random seeded UID to be added to the _key column in Groonga.
createUID = function () {
    return uuid.v4();
};
// Posts the log data to Groonga.
postData = function (params, groonga, q) {
    var qStr = JSON.stringify(q),
        urlObject = url.parse(groongaPath),
        req,
        proxy = urlObject.pathname.length > 1 ? urlObject.pathname : "";
    req = reqProt.request({
        protocol: urlObject.protocol,
        host: urlObject.hostname,
        port: urlObject.port,
        path: proxy + "/d/load?table=" + groonga.table,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(qStr, "utf8")
        }
    });

    req.on("error", function (e) {
        console.log(JSON.stringify(e));
        console.log(qStr);
    });
    req.write(qStr);
    req.end();
};

// Builds the query string to log data to Groonga.
createQuery = function (params, groonga) {
    var existingFields,
        q = [],
        needsCreated = [],
        promise;
    logMsgUID = createUID();
    q[0] = {
        _key: logMsgUID.toString()
    };

    // Gets the columns that can be posted to in Groonga.
    reqProt.get(groongaPath + "/d/select?table=" + groonga.table + "&limit=0", function (res) {
        var data = "",
            obj;
        res.setEncoding("utf8");
        res.on("data", function (chunk) {
            data += chunk;
        });
        res.on("end", function () {
            data = JSON.parse(data);
            if (data.length > 1 && data[1] && data[1][0] && data[1][0].length > 1 && data[1][0][1]) {
                existingFields = data[1][0][1];
                obj = _.find(params, function (n, key) {
                    if (_.isUndefined(n)) {
                        n = "undefined";
                    }
                    q[0][key] = n.toString();
                    // Checks to make sure column exists.
                    if (!_.has(_.invert(_.flattenDeep(existingFields)), key)) {
                        console.log(JSON.stringify(params));
                        return true;
                    } else {
                        return false;
                    }
                });
                if (!obj) {
                    postData(params, groonga, q);
                }
            } else {
                // Table does not exist
                console.log(JSON.stringify(params));
            }
        });
    }).on("error", function (e) {
        console.log(JSON.stringify(params));
    });
};

createPath = function (groonga) {
    if (groonga.url) {
        groongaPath = groonga.url;
    } else if (groonga.path) {
        groongaPath = groonga.protocol + "://" + groonga.host + ":" + groonga.port + groonga.path;
    } else {
        groongaPath = groonga.protocol + "://" + groonga.host + ":" + groonga.port;
    }
};