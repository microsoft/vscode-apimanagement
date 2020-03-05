"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const WebSocket = require("ws");
class DebuggerConnection extends events_1.EventEmitter {
    constructor() {
        super();
        this.responseAwaiters = {};
        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
    }
    isConnected() {
        return this.connection != null;
    }
    attach(address, key, stopOnEntry) {
        return __awaiter(this, void 0, void 0, function* () {
            let connection;
            return new Promise((resolve, reject) => {
                connection = new WebSocket(`${address}?key=${key}`)
                    .on('error', e => {
                    if (this.connection == null || this.connection == connection) {
                        this.connection = null;
                        this.sendEvent('end', `Can't connect to gateway: ${e.message}.`);
                    }
                    reject();
                })
                    .on('open', () => {
                    this.connection = connection;
                    this.sendCommand('attach', {
                        break: stopOnEntry
                    });
                    resolve();
                })
                    .on('message', e => {
                    this.parseResponse(e.toString());
                });
            });
        });
    }
    getRequests() {
        return this.waitForResponse(() => this.sendCommand('getRequests'), 'requests');
    }
    getStackTrace(requestId, threadId) {
        return this.waitForResponse(() => this.sendCommand('getStackTrace', {
            requestId: requestId,
            threadId: threadId
        }), 'stackTrace');
    }
    getVariables(requestId, threadId, path) {
        return this.waitForResponse(() => this.sendCommand('getVariables', {
            requestId: requestId,
            threadId: threadId,
            path: path
        }), 'variables');
    }
    setBreakpoints(breakpoints) {
        this.sendCommand('setBreakpoints', {
            breakpoints: breakpoints
        });
    }
    stepOver(requestId, threadId) {
        this.sendCommand('stepOver', {
            requestId: requestId,
            threadId: threadId
        });
    }
    stepIn(requestId, threadId) {
        this.sendCommand('stepIn', {
            requestId: requestId,
            threadId: threadId
        });
    }
    stepOut(requestId, threadId) {
        this.sendCommand('stepOut', {
            requestId: requestId,
            threadId: threadId
        });
    }
    continue(requestId, threadId) {
        this.sendCommand('continue', {
            requestId: requestId,
            threadId: threadId
        });
    }
    pause(requestId, threadId) {
        this.sendCommand('pause', {
            requestId: requestId,
            threadId: threadId
        });
    }
    terminateRequests(requests) {
        this.sendCommand('terminateRequests', {
            requests: requests
        });
    }
    sendCommand(name, args) {
        if (this.connection == null) {
            return;
        }
        this.connection.send(JSON.stringify({
            name: name,
            arguments: args
        }));
    }
    parseResponse(data) {
        let event = null;
        try {
            event = JSON.parse(data.trim());
        }
        catch (_a) {
            return;
        }
        switch (event.name) {
            case 'stopOnEntry':
                this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId);
                break;
            case 'stopOnStep':
                this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId);
                break;
            case 'stopOnException':
                this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId, event.arguments.message);
                break;
            case 'stopOnBreakpoint':
                this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId);
                break;
            case 'threadExited':
                this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId);
                break;
        }
        const awaiters = this.responseAwaiters[event.name];
        if (awaiters) {
            for (const awaiter of awaiters) {
                awaiter(event.arguments);
            }
            delete this.responseAwaiters[event.name];
        }
    }
    waitForResponse(sendCommand, name) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                (this.responseAwaiters[name] || (this.responseAwaiters[name] = [])).push(resolve);
                sendCommand();
            });
        });
    }
    sendEvent(event, ...args) {
        setImmediate(_ => {
            this.emit(event, ...args);
        });
    }
}
exports.DebuggerConnection = DebuggerConnection;
var StackFrameScopeContract;
(function (StackFrameScopeContract) {
    StackFrameScopeContract["operation"] = "/operations";
    StackFrameScopeContract["api"] = "/apis";
    StackFrameScopeContract["product"] = "/products";
    StackFrameScopeContract["tenant"] = "/tenant";
})(StackFrameScopeContract = exports.StackFrameScopeContract || (exports.StackFrameScopeContract = {}));
//# sourceMappingURL=debuggerConnection.js.map