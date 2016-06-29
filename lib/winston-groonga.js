"use strict";

var winston = require("winston"),
    common = require("winston/lib/winston/common"),
    cycle = require("cycle"),
    uuid = require("node-uuid"),
    util = require("util"),
    url = require("url"),
    request = require("request"),
    _ = require("lodash"),
    url = require("url"),
    Groonga,
    groongaExist = false,
    buildLogString,
    createQuery,
    postData,
    client,
    createUID,
    groongaPath,
    createPath;

// ### function Groonga (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Console transport object responsible
// for making arbitrary HTTP requests whenever log messages and metadata
// are received.
Groonga = exports.Groonga = function (options) {
    this.name = "groonga";
    this.protocol = options.protocol || "http",
    this.url = options.url || "";
    this.host = options.host || "localhost";
    this.port = options.port || "";
    this.path = options.path || "",
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
        req;
    if (groongaExist) {
        request.get({
            url: groongaPath + "/d/load",
            qs: {
                table: groonga.table,
                values: qStr
            },
            json: true
        }, function (error, resp, body) {
            if (error) {
                groongaExist = false;
                console.log(JSON.stringify(error));
                console.log(JSON.stringify(params));
            }
        });
    } else {
        console.log(JSON.stringify(params));
    }
};
buildLogString = function (params) {
    let q = [],
        logMsgUID = createUID();
    q[0] = {
        _key: logMsgUID.toString()
    };
    _.forEach(params, function (n, key) {
        q[0][key] = n && n.toString() || "";
    });
    return q;
}
// Builds the query string to log data to Groonga.
createQuery = function (params, groonga) {
    var existingFields,
        q,
        needsCreated = [],
        promise;

    // Gets the columns that can be posted to in Groonga.
    if (!groongaExist) {
        request.get({
            url: groongaPath + "/d/select",
            qs: {
                table: groonga.table,
                limit: 0
            },
            json: true
        }, function (error, res) {
            if (error) {
                postData(params, groonga, q);
            } else {
                let data = res.body,
                    obj;
                if (data && data.length > 1 && data[1] && data[1][0] && data[1][0].length > 1 && data[1][0][1]) {
                    q = buildLogString(params);
                    groongaExist = true;
                    postData(params, groonga, q);

                } else {
                    // Table does not exist
                    postData(params, groonga, q);
                }
            }
        });
    } else {
        q = buildLogString(params);
        postData(params, groonga, q);
    }
};

createPath = function (groonga) {
    if (groonga.url) {
        groongaPath = groonga.url;
    } else {
        groongaPath = groonga.protocol + "://" + groonga.host;
        if (groonga.port) {
            groongaPath += ":" + groonga.port;
        }
        if (groonga.path) {
            groongaPath += "/" + groonga.path;
        }
    }
};

process.on("uncaughtException", function (error) {
    console.log("winston-groonga uncaught exception: " + error);
});