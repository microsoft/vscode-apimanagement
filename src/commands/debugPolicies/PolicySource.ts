import * as path from 'path';
import * as request from 'request-promise-native';
import { Source } from 'vscode-debugadapter';
import { StackFrameScopeContract } from './debuggerConnection';
import { IPolicyMap, PolicyMapper } from './policyMapper';

// tslint:disable: indent
export class PolicySource {
	private static NextSourceReference = 1;

	private managementAddress: string;
	private auth: string;
	private policies: { [key: string]: IPolicy } = {};

	constructor(managementAddress: string, auth: string) {
		this.managementAddress = managementAddress;
		this.auth = auth;
	}

	getPolicyLocation(scopeId: string, path: string) {
		const policy = this.policies[this.normalizeScopeId(scopeId)];
		if (!policy) {
			return null;
		}

		return policy.map[path];
	}

	async fetchPolicies(scopes: string[]) {
		const policiesToRequest = scopes.map(s => this.normalizeScopeId(s)).filter(s => !this.policies[s]);

		if (policiesToRequest.length) {
			// Batching goes here
			await Promise.all(policiesToRequest.map(s => this.fetchPolicy(s).catch(() => null)));
		}
	}

	getPolicyBySourceReference(id: number) {
		for (const scope in this.policies) {
			const policy = this.policies[scope];
			if (policy && policy.source && policy.source.sourceReference == id) {
				return policy;
			}
		}

		return null;
	}

	getPolicy(scopeId: string): IPolicy {
		return this.policies[this.normalizeScopeId(scopeId)];
	}

	async fetchPolicy(scopeId: string) {
		scopeId = this.normalizeScopeId(scopeId);
		const policyUrl = this.getPolicyUrl(scopeId);
		if (!policyUrl) {
			return null;
		}

		const policyContract: IPolicyContract = await request.get(policyUrl, {
			headers: {
				Authorization: this.auth
			},
			strictSSL: false,
			json: true
		}).on('error', () => {
			//const a = 5;
		}).on('response', () => {
			//const a = 5;
		});

		const policy = this.policies[scopeId] || (this.policies[scopeId] = {
			scopeId: scopeId,
			// some change here
			xml: "",
			source: new Source(scopeId, path.normalize(scopeId), PolicySource.NextSourceReference++),
			map: {}
		});
		policy.xml = policyContract.properties.value;

		this.mapPolicy(policy);

		return policy;
	}

	private normalizeScopeId(scopeId: string) {
		return scopeId.replace(/\\/g, '/');
	}

	private mapPolicy(policy: IPolicy) {
		if (!policy || !policy.xml) {
			return;
		}

		policy.map = new PolicyMapper().mapPolicy(policy.xml);
	}

	private getPolicyUrl(scopeId: string) {
		if (scopeId == StackFrameScopeContract.tenant) {
			return `${this.managementAddress}/policies/policy?api-version=2019-01-01&format=xml-raw`;
		} else {
			return `${this.managementAddress}/${scopeId}/policies/policy?api-version=2019-01-01&format=xml-raw`;
		}
	}
}

interface IPolicyContract {
	properties: {
		format: string,
		value: string
	};
}

interface IPolicy {
	scopeId: string;
	xml: string;
	source: Source;
	map: IPolicyMap;
}
