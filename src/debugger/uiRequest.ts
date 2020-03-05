import { UiThread } from "./uiThread";
import { PolicySource } from "./policySource";

export class UiRequest {
	private operationId: string;
	private apiId: string;
	private productId: string;

	id: string;
	threads: UiThread[];

	constructor(id: string, operationId: string, apiId: string, productId: string) {
		this.id = id;
		this.threads = [];

		this.operationId = operationId;
		this.apiId = apiId;
		this.productId = productId;
	}

	addNewThread(gatewayThread: number, policySource: PolicySource) {
		let thread: UiThread;
		this.threads.push(thread = new UiThread(gatewayThread, this.operationId, this.apiId, this.productId, policySource));
		return thread;
	}

	findThreadByStackFrameId(id: number) {
		for (const thread of this.threads) {
			if (thread.containsStackFrame(id)) {
				return thread;
			}
		}

		return null;
	}

	findThreadById(id: number) {
		for (const thread of this.threads) {
			if (thread.id == id) {
				return thread;
			}
		}

		return null;
	}

	findThreadByUiId(uiId: number) {
		for (const thread of this.threads) {
			if (thread.uiId == uiId) {
				return thread;
			}
		}

		return null;
	}
}