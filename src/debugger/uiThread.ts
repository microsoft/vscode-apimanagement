import { StackFrame } from 'vscode-debugadapter';
import { StackFrameContract, StackFrameScopeContract } from './debuggerConnection';
import { PolicySource } from './policySource';
import { DebugProtocol } from 'vscode-debugprotocol';

interface PendingSource {
	scopeId: string;
	stackFrames: StackFrame[];
};

export class UiThread {
	private static NextThreadId = 1;
	private static NextStackFrameId = 1;

	private operationId: string;
	private apiId: string;
	private productId: string;
	private stackFrames: {
		[key: string]: StackFrame
	} = {};
	private policySource: PolicySource;

	id: number;
	uiId: number;

	constructor (id: number, operationId: string, apiId: string, productId: string, policySource: PolicySource) {
		this.id = id;
		this.uiId = UiThread.NextThreadId++;

		this.operationId = operationId;
		this.apiId = apiId;
		this.productId = productId;
		this.policySource = policySource;
	}

	containsStackFrame(id: number) {
		for (const key in this.stackFrames) {
			if (this.stackFrames[key].id == id) {
				return true;
			}
		}

		return false;
	}

	async getStackFrames(frames: StackFrameContract[]) {
		if (!frames.length) {
			return [];
		}

		// Create UI stack frames
		const stack: {
			key: string,
			frame: StackFrameContract,
			isVirtual: boolean,
			stackFrame: StackFrame
		}[] = [];
		const allFrames = this.addVirtualStack(frames);
		const pendingSources: PendingSource[] = [];
		let prevFrame: StackFrameContract = null;
		let path: string[] = [];
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
			await this.policySource.fetchPolicies(pendingSources.map(p => p.scopeId));
		}

		// Assign source line numbers as per scope, name, and index
		for (const item of stack) {
			const frame = item.frame;
			const stackFrame = <DebugProtocol.StackFrame>item.stackFrame;

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
		for (let index = 0; index < stack.length; ) {
			if (stack[index].isVirtual && (!stack[index].stackFrame.source || !stack[index].stackFrame.line && !stack[index].stackFrame.column)) {
				stack.splice(index, 1);
			} else {
				index++;
			}
		}

		return stack.map(s => s.stackFrame).reverse();
	}

	private addVirtualStack(frames: StackFrameContract[]): (StackFrameContract & { isVirtual?: true })[] {
		let allFrames: (StackFrameContract & { isVirtual?: true })[] = [...frames];

		let lastFrame = allFrames[frames.length - 1];
		if (lastFrame.scopeId == StackFrameScopeContract.tenant && this.productId) {
			allFrames.push(lastFrame = {
				scopeId: `/products/${this.productId}`,
				name: 'base',
				section: lastFrame.section,
				index: 0,
				isVirtual: true
			});
		}

		if ((lastFrame.scopeId == StackFrameScopeContract.tenant || lastFrame.scopeId.startsWith(StackFrameScopeContract.product)) && this.apiId) {
			allFrames.push(lastFrame = {
				scopeId: `/apis/${this.apiId}`,
				name: 'base',
				section: lastFrame.section,
				index: 0,
				isVirtual: true
			});
		}

		if (lastFrame.scopeId.startsWith(StackFrameScopeContract.api) && !lastFrame.scopeId.includes('/operations/') && this.apiId && this.operationId) {
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

	private static addPendingSource(pendingSources: PendingSource[], frame: StackFrameContract, stackFrame: StackFrame) {
		let pendingSource = pendingSources.find(s => s.scopeId == frame.scopeId);
		if (!pendingSource) {
			pendingSources.push(pendingSource = {
				scopeId: frame.scopeId,
				stackFrames: []
			});
		}

		pendingSource.stackFrames.push(stackFrame);
	}

	private getStackFrame(frame: StackFrameContract, path: string, pendingSources: PendingSource[]) {
		const frameKey = `${frame.scopeId}/${path}`;
		let stackFrame = this.stackFrames[frameKey];
		if (!stackFrame) {
			this.stackFrames[frameKey] = stackFrame = new StackFrame(UiThread.NextStackFrameId++, frame.name);
			const policy = this.policySource.getPolicy(frame.scopeId);
			stackFrame.source = policy && policy.source;
			if (!stackFrame.source) {
				UiThread.addPendingSource(pendingSources, frame, stackFrame);
			}
		}

		return stackFrame;
	}
}