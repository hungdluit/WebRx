﻿///<reference path="../../node_modules/rx/ts/rx.all.d.ts" />

module wx.log {
    function log(...args:any[]) {
        try {
            console.log.apply(console, arguments);
        } catch (e) {
            try {
                window['opera'].postError.apply(window['opera'], arguments);
            } catch (e) {
                alert(Array.prototype.join.call(arguments, " "));
            }
        }
    }

    export function critical(fmt: string, ...args: any[]) {
        if (args.length) {
            fmt = utils.formatString(fmt, args);
        }

        log("**** WebRx Critical: " + fmt);
    }

    export function error(fmt: string, ...args: any[]) {
        if (args.length) {
            fmt = utils.formatString(fmt, args);
        }

        log("*** WebRx Error: " + fmt);
    }

    export function info(fmt: string, ...args: any[]) {
        if (args.length) {
            fmt = utils.formatString(fmt, args);
        }

        log("* WebRx Info: " + fmt);
    }
}

