/*global describe*/
/*global it*/
/*global afterEach*/
/*global beforeEach*/
/* exported should */ // suppresses weird warning about should never being used when it very much is
"use strict";

const chai = require("chai"),
    expect = chai.expect,
    should = chai.should(),
    nock = require("nock"),
    winston = require("winston"),
    wg = require("../lib/winston-groonga.js").Groonga,
    def = {
        host: "localhost",
        port: 9999,
        protocol: "https",
        table: "testtable",
        level: "info"
    };
const gUrl = "https://localhost:9999";
const levels = ["silly", "debug", "info", "warn", "error"];

describe("winston-groonga", () => {
    beforeEach(function () {
        nock.cleanAll();
    });
    afterEach(function () {
        winston.remove(wg);
    });
    it("should configure on startup", () => {
        winston.add(wg, def);
        winston.log("silly", "test1");
    });
    it("Should send the configured log level to Groonga", (done) => {
        const numLogs = levels.length - levels.indexOf(def.level);
        let idx = 0;
        const resp = [[],[[[1],[["_id","UInt32"]],[1]]]];
        const scope = nock(gUrl)
            .get("/d/select")
            .times(levels.length)
            .query((qobj)=> {
                // console.log("select " + JSON.stringify(qobj));
                // console.log("table: " + qobj.table);
                return true;
            })
            .reply(200, resp)
            .get("/d/load")
            .query(true)
            .query((qobj)=> {
                idx++;
                // console.log("load " + JSON.stringify(qobj));
                const message = JSON.parse(qobj.values)[0].message;
                // console.log("message: " + message);
                // console.log("length: " + numLogs + "/" + "%s", idx);
                if (numLogs === idx) {
                    // console.log("Done called");
                    done();
                }
                return true;
            })
            .times(levels.length)
            .reply(200, {});
        winston.add(wg, def);
        let i = 0;
        levels.forEach((level) => {
            winston.log(level, i++);
        });
    });
});
