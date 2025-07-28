/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import { TokenCredential } from "@azure/core-auth";
import * as path from 'path';
import axios from 'axios';
import { Source } from 'vscode-debugadapter';
import * as Constants from "../constants";
import { getBearerToken } from '../utils/requestUtil';
import { StackFrameScopeContract } from './debuggerConnection';
import { PolicyLocation, PolicyMap, PolicyMapper } from './policyMapper';

// tslint:disable: no-unsafe-any
// tslint:disable: indent
// tslint:disable: export-name
// tslint:disable: strict-boolean-expressions
// tslint:disable: no-non-null-assertion
// tslint:disable: no-for-in
// tslint:disable: forin
// tslint:disable: no-shadowed-variable
// tslint:disable: interface-name

export class PolicySource {
	private static NextSourceReference : number = 1;

	private managementAddress: string;
	private credential: TokenCredential | undefined;
	private auth: string | undefined;
	private policies: { [key: string]: Policy } = {};

	constructor(managementAddress: string, credential?: TokenCredential, auth?: string) {
		this.managementAddress = managementAddress;
		this.credential = credential;
		this.auth = auth;
		if (!credential && !auth) {
			throw new Error("Missing credentials!");
		}
	}

	public getPolicyLocation(scopeId: string, path: string): PolicyLocation | null {
		const policy = this.policies[this.normalizeScopeId(scopeId)];
		if (!policy) {
			return null;
		}

		if (Object.keys(policy.map).includes(path)) {
			return policy.map[path];
		}

		const paths = path.split("/");
		const mapKeys = Object.keys(policy.map).map(s => s.split("/")).filter(s => s.length === paths.length);

		for (const curKey of mapKeys) {
			let isEqual = true;
			// tslint:disable-next-line: prefer-for-of
			for (let idx = 0; idx < paths.length; idx++) {
				if (paths[idx] === curKey[idx]) {
					continue;
				} else {
					isEqual = false;
				}
			}
			if (isEqual === true) {
				return policy.map[curKey.join("/")];
			}
		}
		return null;
	}

	public async fetchPolicies(scopes: string[]): Promise<void> {
		const policiesToRequest = scopes.map(s => this.normalizeScopeId(s)).filter(s => !this.policies[s]);

		if (policiesToRequest.length) {
			// Batching goes here
			await Promise.all(policiesToRequest.map(s => this.fetchPolicy(s).catch(_e => null)));
		}
	}

	public getPolicyBySourceReference(id: number | undefined): Policy | null {
		for (const scope in this.policies) {
			const policy = this.policies[scope];
			if (policy && policy.source && policy.source.sourceReference === id) {
				return policy;
			}
		}

		return null;
	}

	public getPolicy(scopeId: string): Policy {
		return this.policies[this.normalizeScopeId(scopeId)];
	}

	public async fetchPolicy(scopeId: string): Promise<Policy | null> {
		scopeId = this.normalizeScopeId(scopeId);
		const policyUrl = this.getPolicyUrl(scopeId);
		if (!policyUrl) {
			return null;
		}

		let authToken;
		if (this.auth) {
			authToken = this.auth;
		} else {
			authToken = await getBearerToken(policyUrl, "GET", this.credential!);
		}
		const policyContract: PolicyContract = (await axios.get(policyUrl, {
			headers: {
				Authorization: authToken
			}
		})).data;

		const policy = this.policies[scopeId] || (this.policies[scopeId] = {
			scopeId: scopeId,
			xml: null,
			source: new Source(scopeId, path.normalize(scopeId), PolicySource.NextSourceReference++),
			map: {}
		});
		policy.xml = policyContract.properties.value;

		this.mapPolicy(policy);

		return policy;
	}

	private normalizeScopeId(scopeId: string): string {
		return scopeId.replace(/\\/g, '/');
	}

	private mapPolicy(policy: Policy): void {
		if (!policy || !policy.xml) {
			return;
		}

		policy.map = new PolicyMapper().mapPolicy(policy.xml);
	}

	private getPolicyUrl(scopeId: string): string {
		if (scopeId === StackFrameScopeContract.tenant) {
			return `${this.managementAddress}/policies/policy?api-version=${Constants.apimApiVersion}&format=xml-raw`;
		} else {
			return `${this.managementAddress}/${scopeId}/policies/policy?api-version=${Constants.apimApiVersion}&format=xml-raw`;
		}
	}
}

interface PolicyContract {
	properties: {
		format: string,
		value: string
	};
}

interface Policy {
	scopeId: string;
	xml: string | null;
	source: Source;
	map: PolicyMap;
}
