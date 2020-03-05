"use strict";
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
;
class UiThread {
    constructor(id, operationId, apiId, productId, policySource) {
        this.stackFrames = {};
        this.id = id;
        this.uiId = UiThread.NextThreadId++;
        this.operationId = operationId;
        this.apiId = apiId;
        this.productId = productId;
        this.policySource = policySource;
    }
    containsStackFrame(id) {
        for (const key in this.stackFrames) {
            if (this.stackFrames[key].id == id) {
                return true;
            }
        }
        return false;
    }
    getStackFrames(frames) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!frames.length) {
                return [];
            }
            // Create UI stack frames
            const stack = [];
            const allFrames = this.addVirtualStack(frames);
            const pendingSources = [];
            let prevFrame = null;
            let path = [];
            for (const frame of allFrames.reverse()) {
                if (!path.length || prevFrame && (prevFrame.scopeId != frame.scopeId)) {
                    path = ['policies', frame.section];
                }
                prevFrame = frame;
                path.push(frame.index ? `${frame.name}[${frame.index}]` : frame.name);
                const stackFrameKey = path.join('/');
                stack.push({
                    key: stackFrameKey,
                    frame: frame,
                    isVirtual: frame.isVirtual,
                    stackFrame: this.getStackFrame(frame, stackFrameKey, pendingSources)
                });
            }
            // Fetch any sources if necessary
            if (pendingSources.length) {
                yield this.policySource.fetchPolicies(pendingSources.map(p => p.scopeId));
            }
            // Assign source line numbers as per scope, name, and index
            for (const item of stack) {
                const frame = item.frame;
                const stackFrame = item.stackFrame;
                if (!stackFrame.source) {
                    const policy = this.policySource.getPolicy(frame.scopeId);
                    stackFrame.source = policy && policy.source;
                }
                if (!stackFrame.line && !stackFrame.column && !stackFrame.endLine && !stackFrame.endColumn) {
                    const location = this.policySource.getPolicyLocation(frame.scopeId, item.key);
                    if (location) {
                        stackFrame.line = location.line;
                        stackFrame.column = location.column;
                        stackFrame.endLine = location.endLine;
                        stackFrame.endColumn = location.endColumn;
                    }
                }
            }
            // Remove any 'virtual' UI stack frames if no policy present
            for (let index = 0; index < stack.length;) {
                if (stack[index].isVirtual && (!stack[index].stackFrame.source || !stack[index].stackFrame.line && !stack[index].stackFrame.column)) {
                    stack.splice(index, 1);
                }
                else {
                    index++;
                }
            }
            return stack.map(s => s.stackFrame).reverse();
        });
    }
    addVirtualStack(frames) {
        let allFrames = [...frames];
        let lastFrame = allFrames[frames.length - 1];
        if (lastFrame.scopeId == debuggerConnection_1.StackFrameScopeContract.tenant && this.productId) {
            allFrames.push(lastFrame = {
                scopeId: `/products/${this.productId}`,
                name: 'base',
                section: lastFrame.section,
                index: 0,
                isVirtual: true
            });
        }
        if ((lastFrame.scopeId == debuggerConnection_1.StackFrameScopeContract.tenant || lastFrame.scopeId.startsWith(debuggerConnection_1.StackFrameScopeContract.product)) && this.apiId) {
            allFrames.push(lastFrame = {
                scopeId: `/apis/${this.apiId}`,
                name: 'base',
                section: lastFrame.section,
                index: 0,
                isVirtual: true
            });
        }
        if (lastFrame.scopeId.startsWith(debuggerConnection_1.StackFrameScopeContract.api) && !lastFrame.scopeId.includes('/operations/') && this.apiId && this.operationId) {
            allFrames.push(lastFrame = {
                scopeId: `/apis/${this.apiId}/operations/${this.operationId}`,
                name: 'base',
                section: lastFrame.section,
                index: 0,
                isVirtual: true
            });
        }
        return allFrames;
    }
    static addPendingSource(pendingSources, frame, stackFrame) {
        let pendingSource = pendingSources.find(s => s.scopeId == frame.scopeId);
        if (!pendingSource) {
            pendingSources.push(pendingSource = {
                scopeId: frame.scopeId,
                stackFrames: []
            });
        }
        pendingSource.stackFrames.push(stackFrame);
    }
    getStackFrame(frame, path, pendingSources) {
        const frameKey = `${frame.scopeId}/${path}`;
        let stackFrame = this.stackFrames[frameKey];
        if (!stackFrame) {
            this.stackFrames[frameKey] = stackFrame = new vscode_debugadapter_1.StackFrame(UiThread.NextStackFrameId++, frame.name);
            const policy = this.policySource.getPolicy(frame.scopeId);
            stackFrame.source = policy && policy.source;
            if (!stackFrame.source) {
                UiThread.addPendingSource(pendingSources, frame, stackFrame);
            }
        }
        return stackFrame;
    }
}
UiThread.NextThreadId = 1;
UiThread.NextStackFrameId = 1;
exports.UiThread = UiThread;
//# sourceMappingURL=uiThread.js.map