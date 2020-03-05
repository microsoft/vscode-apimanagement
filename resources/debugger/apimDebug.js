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
const vscode_debugadapter_1 = require("vscode-debugadapter");
const debuggerConnection_1 = require("./debuggerConnection");
const request = require("request-promise-native");
const uiRequest_1 = require("./uiRequest");
const policySource_1 = require("./policySource");
const { Subject } = require('await-notify');
class ApimDebugSession extends vscode_debugadapter_1.LoggingDebugSession {
    constructor() {
        super();
        this.configurationDone = new Subject();
        this.requests = [];
        this.variablesHandles = new vscode_debugadapter_1.Handles();
        this.setDebuggerLinesStartAt1(false);
        this.setDebuggerColumnsStartAt1(false);
        this.runtime = new debuggerConnection_1.DebuggerConnection();
        this.runtime.on('stopOnEntry', (requestId, threadId, operationId, apiId, productId) => this.onStopOnEntry(requestId, threadId, operationId, apiId, productId));
        this.runtime.on('stopOnStep', (requestId, threadId) => this.onStop('step', requestId, threadId));
        this.runtime.on('stopOnBreakpoint', (requestId, threadId) => this.onStop('breakpoint', requestId, threadId));
        this.runtime.on('stopOnException', (requestId, threadId, operationId, apiId, productId, message) => this.onStopOnException(requestId, threadId, operationId, apiId, productId, message));
        this.runtime.on('threadExited', (requestId, threadId) => this.onThreadExited(requestId, threadId));
        this.runtime.on('end', message => {
            this.requests = [];
            if (message) {
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(message, 'stderr'));
            }
            this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
        });
    }
    onStopOnEntry(requestId, threadId, operationId, apiId, productId) {
        this.updateRequests([
            {
                id: requestId,
                threads: [threadId],
                operationId: operationId,
                apiId: apiId,
                productId: productId,
            }
        ], false);
        this.onStop('entry', requestId, threadId);
    }
    onStopOnException(requestId, threadId, operationId, apiId, productId, message) {
        this.updateRequests([
            {
                id: requestId,
                threads: [threadId],
                operationId: operationId,
                apiId: apiId,
                productId: productId,
            }
        ], false);
        this.onStop('exception', requestId, threadId, message);
    }
    onThreadExited(requestId, threadId) {
        const request = this.requests.find(r => r.id == requestId);
        const thread = request && request.findThreadById(threadId);
        if (thread) {
            this.sendEvent(new vscode_debugadapter_1.ThreadEvent('exited', thread.uiId));
        }
    }
    onStop(event, requestId, threadId, exceptionText) {
        const request = this.requests.find(r => r.id == requestId);
        const thread = request && request.findThreadById(threadId);
        if (thread) {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent(event, thread.uiId, exceptionText));
        }
    }
    initializeRequest(response, args) {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        this.sendResponse(response);
    }
    configurationDoneRequest(response, args) {
        super.configurationDoneRequest(response, args);
        this.configurationDone.notify();
    }
    launchRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            vscode_debugadapter_1.logger.setup(vscode_debugadapter_1.Logger.LogLevel.Verbose, false);
            this.policySource = new policySource_1.PolicySource(args.managementAddress, args.managementAuth);
            const masterKey = yield this.getMasterSubscriptionKey(args.managementAddress, args.managementAuth);
            this.availablePolicies = yield this.getAvailablePolicies(args.managementAddress, args.managementAuth);
            this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
            yield this.configurationDone.wait(1000);
            yield this.runtime.attach(args.gatewayAddress, masterKey, !!args.stopOnEntry);
            this.sendResponse(response);
            this.updateRequests(yield this.runtime.getRequests(), true);
        });
    }
    getMasterSubscriptionKey(managementAddress, managementAuth) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscription = yield request.get(`${managementAddress}/subscriptions/master?api-version=2019-01-01`, {
                headers: {
                    Authorization: managementAuth
                },
                strictSSL: false,
                json: true
            }).on('error', e => {
                this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
            }).on('response', e => {
                if (e.statusCode != 200) {
                    this.sendEvent(new vscode_debugadapter_1.OutputEvent(`Error fetching master subscription: ${e.statusCode} ${e.statusMessage}`, 'stderr'));
                    this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
                }
            });
            return subscription.properties.primaryKey;
        });
    }
    getAvailablePolicies(managementAddress, managementAuth) {
        return __awaiter(this, void 0, void 0, function* () {
            const snippets = yield request.get(`${managementAddress}/policysnippets?api-version=2019-01-01`, {
                headers: {
                    Authorization: managementAuth
                },
                strictSSL: false,
                json: true
            }).on('error', e => {
                this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
            }).on('response', e => {
                if (e.statusCode != 200) {
                    this.sendEvent(new vscode_debugadapter_1.OutputEvent(`Error fetching policy definitions: ${e.statusCode} ${e.statusMessage}`, 'stderr'));
                    this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
                }
            });
            return snippets.map(s => s.content.substring(1, /[\s>/]/.exec(s.content).index));
        });
    }
    threadsRequest(response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.runtime.isConnected()) {
                this.updateRequests(yield this.runtime.getRequests(), true);
            }
            const threads = [];
            for (const request of this.requests) {
                for (const thread of request.threads) {
                    threads.push(new vscode_debugadapter_1.Thread(thread.uiId, `${request.id} (${thread.id})`));
                }
            }
            response.body = {
                threads: threads
            };
            this.sendResponse(response);
        });
    }
    terminateThreadsRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const requests = args.arguments.threadIds.map(id => this.findThreadByUiId(id));
            if (requests.length) {
                yield this.runtime.terminateRequests(requests.map(r => r[0].id).filter((value, index, self) => self.indexOf(value) === index));
            }
            this.sendResponse(response);
        });
    }
    stackTraceRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            let stack = [];
            if (this.runtime.isConnected()) {
                const request = this.findThreadByUiId(args.threadId);
                if (request) {
                    const requestStack = yield this.runtime.getStackTrace(request[0].id, request[1].id);
                    stack = yield request[1].getStackFrames(requestStack);
                    for (const item of stack) {
                        if (item.line) {
                            item.line = this.convertDebuggerLineToClient(item.line);
                        }
                        if (item.column) {
                            item.column = this.convertDebuggerColumnToClient(item.column);
                        }
                        if (item.endLine) {
                            item.endLine = this.convertDebuggerLineToClient(item.endLine);
                        }
                        if (item.endColumn) {
                            item.endColumn = this.convertDebuggerColumnToClient(item.endColumn) + 1;
                        }
                    }
                }
            }
            response.body = {
                stackFrames: stack,
                totalFrames: stack.length
            };
            this.sendResponse(response);
        });
    }
    sourceRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const policy = this.policySource.getPolicyBySourceReference(args.sourceReference);
            response.body = {
                content: policy && policy.xml,
                mimeType: 'application/vnd.ms-azure-apim.policy.raw+xml'
            };
            this.sendResponse(response);
        });
    }
    continueRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = this.findThreadByUiId(args.threadId);
            if (request && this.runtime.isConnected()) {
                yield this.runtime.continue(request[0].id, request[1].id);
            }
            this.sendResponse(response);
        });
    }
    nextRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = this.findThreadByUiId(args.threadId);
            if (request && this.runtime.isConnected()) {
                yield this.runtime.stepOver(request[0].id, request[1].id);
            }
            this.sendResponse(response);
        });
    }
    stepInRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = this.findThreadByUiId(args.threadId);
            if (request && this.runtime.isConnected()) {
                yield this.runtime.stepIn(request[0].id, request[1].id);
            }
            this.sendResponse(response);
        });
    }
    stepOutRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = this.findThreadByUiId(args.threadId);
            if (request && this.runtime.isConnected()) {
                yield this.runtime.stepOut(request[0].id, request[1].id);
            }
            this.sendResponse(response);
        });
    }
    pauseRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = this.findThreadByUiId(args.threadId);
            if (request && this.runtime.isConnected()) {
                yield this.runtime.pause(request[0].id, request[1].id);
            }
            this.sendResponse(response);
        });
    }
    scopesRequest(response, args) {
        let scopes;
        const request = this.findThreadByStackFrameId(args.frameId);
        if (request) {
            scopes = [new vscode_debugadapter_1.Scope("Request", this.variablesHandles.create(`${request[0].id}|${request[1].id}`), true)];
        }
        response.body = {
            scopes: scopes || []
        };
        this.sendResponse(response);
    }
    variablesRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            let variables;
            if (this.runtime.isConnected()) {
                const variableScope = this.variablesHandles.get(args.variablesReference);
                ;
                const scopeParts = variableScope.split('|');
                if (scopeParts.length >= 2) {
                    const vars = yield this.runtime.getVariables(scopeParts[0], +scopeParts[1], scopeParts.slice(2).join('.'));
                    variables = vars.map(v => {
                        const variable = new vscode_debugadapter_1.Variable(v.name, v.value, v.nestedCount ? this.variablesHandles.create(`${variableScope}|${v.name}`) : 0);
                        variable.type = v.type;
                        variable.namedVariables = v.nestedCount;
                        variable.presentationHint = {
                            kind: 'property',
                            visibility: 'public'
                        };
                        return variable;
                    });
                }
            }
            response.body = {
                variables: variables || [],
            };
            this.sendResponse(response);
        });
    }
    setBreakPointsRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            let breakpoints;
            const breakpointsToSet = [];
            if (args.breakpoints.length) {
                let policy = this.policySource.getPolicyBySourceReference(args.source.sourceReference);
                if (!policy && args.source.name) {
                    policy = this.policySource.getPolicy(args.source.name) || (yield this.policySource.fetchPolicy(args.source.name));
                }
                if (policy) {
                    breakpoints = args.breakpoints.map(b => {
                        let position = {
                            line: -1,
                            column: -1,
                            endLine: -1,
                            endColumn: -1
                        };
                        let path = null;
                        const breakpointLine = this.convertClientLineToDebugger(b.line);
                        const breakpointColumn = b.column && this.convertClientColumnToDebugger(b.column);
                        for (const key in policy.map) {
                            const mapEntry = policy.map[key];
                            if (mapEntry.line == breakpointLine
                                && (!breakpointColumn || breakpointColumn >= mapEntry.column && breakpointColumn <= mapEntry.endColumn)
                                && (position.line == -1 || mapEntry.column < position.column)) {
                                path = key;
                                position = mapEntry;
                            }
                        }
                        if (position.line == -1) {
                            return new vscode_debugadapter_1.Breakpoint(false);
                        }
                        const policyName = path.substring(path.lastIndexOf('/') + 1);
                        if (this.availablePolicies.indexOf(policyName) == -1) {
                            return new vscode_debugadapter_1.Breakpoint(false);
                        }
                        breakpointsToSet.push({
                            path: path.substr(path.indexOf('/') + 1),
                            scopeId: policy.scopeId
                        });
                        const breakpoint = new vscode_debugadapter_1.Breakpoint(true, this.convertDebuggerLineToClient(position.line), this.convertDebuggerColumnToClient(position.column), policy.source);
                        breakpoint.endLine = this.convertDebuggerLineToClient(position.endLine);
                        breakpoint.endColumn = this.convertDebuggerColumnToClient(position.endColumn);
                        return breakpoint;
                    });
                }
            }
            if (breakpointsToSet.length) {
                yield this.runtime.setBreakpoints(breakpointsToSet);
            }
            response.body = {
                breakpoints: breakpoints || args.breakpoints.map(b => new vscode_debugadapter_1.Breakpoint(false))
            };
            this.sendResponse(response);
        });
    }
    findThreadByUiId(id) {
        for (const uiRequest of this.requests) {
            const uiThread = uiRequest.findThreadByUiId(id);
            if (uiThread) {
                return [uiRequest, uiThread];
            }
        }
        return null;
    }
    findThreadByStackFrameId(id) {
        for (const uiRequest of this.requests) {
            const uiThread = uiRequest.findThreadByStackFrameId(id);
            if (uiThread) {
                return [uiRequest, uiThread];
            }
        }
        return null;
    }
    updateRequests(gatewayRequests, clean) {
        if (clean) {
            let requestIndex = 0;
            while (requestIndex < this.requests.length) {
                const uiRequest = this.requests[requestIndex];
                const gatewayRequest = gatewayRequests.find(r => r.id == uiRequest.id);
                if (!gatewayRequest) {
                    for (const thread of uiRequest.threads) {
                        this.sendEvent(new vscode_debugadapter_1.ThreadEvent('exited', thread.uiId));
                    }
                    this.requests.splice(requestIndex, 1);
                    continue;
                }
                let threadIndex = 0;
                while (threadIndex < uiRequest.threads.length) {
                    const uiThread = uiRequest.threads[threadIndex];
                    if (gatewayRequest.threads.indexOf(uiThread.id) < 0) {
                        this.sendEvent(new vscode_debugadapter_1.ThreadEvent('exited', uiThread.uiId));
                        uiRequest.threads.splice(threadIndex, 1);
                        continue;
                    }
                    threadIndex++;
                }
                if (!uiRequest.threads.length) {
                    this.requests.splice(requestIndex, 1);
                    continue;
                }
                requestIndex++;
            }
        }
        for (const gatewayRequest of gatewayRequests) {
            let uiRequest = this.requests.find(r => r.id == gatewayRequest.id);
            if (!uiRequest) {
                this.requests.push(uiRequest = new uiRequest_1.UiRequest(gatewayRequest.id, gatewayRequest.operationId, gatewayRequest.apiId, gatewayRequest.productId));
            }
            for (const gatewayThread of gatewayRequest.threads) {
                let uiThread = uiRequest.threads.find(t => t.id == gatewayThread);
                if (!uiThread) {
                    uiThread = uiRequest.addNewThread(gatewayThread, this.policySource);
                    this.sendEvent(new vscode_debugadapter_1.ThreadEvent('started', uiThread.uiId));
                }
            }
        }
    }
}
exports.ApimDebugSession = ApimDebugSession;
//# sourceMappingURL=apimDebug.js.map