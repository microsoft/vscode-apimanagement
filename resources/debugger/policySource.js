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
const request = require("request-promise-native");
const vscode_debugadapter_1 = require("vscode-debugadapter");
const policyMapper_1 = require("./policyMapper");
const debuggerConnection_1 = require("./debuggerConnection");
const path = require("path");
class PolicySource {
    constructor(managementAddress, auth) {
        this.policies = {};
        this.managementAddress = managementAddress;
        this.auth = auth;
    }
    getPolicyLocation(scopeId, path) {
        const policy = this.policies[this.normalizeScopeId(scopeId)];
        if (!policy) {
            return null;
        }
        return policy.map[path];
    }
    fetchPolicies(scopes) {
        return __awaiter(this, void 0, void 0, function* () {
            const policiesToRequest = scopes.map(s => this.normalizeScopeId(s)).filter(s => !this.policies[s]);
            if (policiesToRequest.length) {
                // Batching goes here
                yield Promise.all(policiesToRequest.map(s => this.fetchPolicy(s).catch(e => null)));
            }
        });
    }
    getPolicyBySourceReference(id) {
        for (const scope in this.policies) {
            const policy = this.policies[scope];
            if (policy && policy.source && policy.source.sourceReference == id) {
                return policy;
            }
        }
        return null;
    }
    getPolicy(scopeId) {
        return this.policies[this.normalizeScopeId(scopeId)];
    }
    fetchPolicy(scopeId) {
        return __awaiter(this, void 0, void 0, function* () {
            scopeId = this.normalizeScopeId(scopeId);
            const policyUrl = this.getPolicyUrl(scopeId);
            if (!policyUrl) {
                return null;
            }
            const policyContract = yield request.get(policyUrl, {
                headers: {
                    Authorization: this.auth
                },
                strictSSL: false,
                json: true
            }).on('error', e => {
                //const a = 5;
            }).on('response', e => {
                //const a = 5;
            });
            const policy = this.policies[scopeId] || (this.policies[scopeId] = {
                scopeId: scopeId,
                xml: null,
                source: new vscode_debugadapter_1.Source(scopeId, path.normalize(scopeId), PolicySource.NextSourceReference++),
                map: {}
            });
            policy.xml = policyContract.properties.value;
            this.mapPolicy(policy);
            return policy;
        });
    }
    normalizeScopeId(scopeId) {
        return scopeId.replace(/\\/g, '/');
    }
    mapPolicy(policy) {
        if (!policy || !policy.xml) {
            return;
        }
        policy.map = new policyMapper_1.PolicyMapper().mapPolicy(policy.xml);
    }
    getPolicyUrl(scopeId) {
        if (scopeId == debuggerConnection_1.StackFrameScopeContract.tenant) {
            return `${this.managementAddress}/policies/policy?api-version=2019-01-01&format=xml-raw`;
        }
        else {
            return `${this.managementAddress}/${scopeId}/policies/policy?api-version=2019-01-01&format=xml-raw`;
        }
    }
}
PolicySource.NextSourceReference = 1;
exports.PolicySource = PolicySource;
//# sourceMappingURL=policySource.js.map