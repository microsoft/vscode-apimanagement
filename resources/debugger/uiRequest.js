"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uiThread_1 = require("./uiThread");
class UiRequest {
    constructor(id, operationId, apiId, productId) {
        this.id = id;
        this.threads = [];
        this.operationId = operationId;
        this.apiId = apiId;
        this.productId = productId;
    }
    addNewThread(gatewayThread, policySource) {
        let thread;
        this.threads.push(thread = new uiThread_1.UiThread(gatewayThread, this.operationId, this.apiId, this.productId, policySource));
        return thread;
    }
    findThreadByStackFrameId(id) {
        for (const thread of this.threads) {
            if (thread.containsStackFrame(id)) {
                return thread;
            }
        }
        return null;
    }
    findThreadById(id) {
        for (const thread of this.threads) {
            if (thread.id == id) {
                return thread;
            }
        }
        return null;
    }
    findThreadByUiId(uiId) {
        for (const thread of this.threads) {
            if (thread.uiId == uiId) {
                return thread;
            }
        }
        return null;
    }
}
exports.UiRequest = UiRequest;
//# sourceMappingURL=uiRequest.js.map