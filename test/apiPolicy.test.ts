/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as sinon from 'sinon';
import { ApimService } from '../src/azure/apim/ApimService';
import { AzureServiceClient } from '../src/azure/azureServiceClient';
import { emptyPolicyXml } from '../src/constants';
import { ApiPolicyEditor } from '../src/explorer/editors/policy/ApiPolicyEditor';
import { IApiTreeRoot } from '../src/explorer/IApiTreeRoot';
import { ITreeItemWithRoot } from '../src/explorer/ITreeItemWithRoot';
import { assertThrowsAsync } from './assertThrowsAsync';

describe('API policy retrieval', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('ApimService.getApiPolicy', () => {
        const policyXml = '<policies><inbound><base /></inbound></policies>';

        function createService(): ApimService {
            // tslint:disable-next-line: no-any
            return new ApimService({} as any, 'https://management.azure.com', 'sub-id', 'test-rg', 'test-service');
        }

        it('returns the policy XML from properties.value on success', async () => {
            const sendRequest = sandbox.stub(AzureServiceClient.prototype, 'sendRequest').resolves({
                status: 200,
                parsedBody: { properties: { value: policyXml } },
                bodyAsText: JSON.stringify({ properties: { value: policyXml } }),
                headers: {}
            });

            const result = await createService().getApiPolicy('test-api');

            expect(result).to.equal(policyXml);
            expect(sendRequest.calledOnce).to.be.true;
            const request = sendRequest.firstCall.args[0];
            expect(request.method).to.equal('GET');
            expect(request.url).to.contain('/apis/test-api/policies/policy');
            expect(request.url).to.contain('format=rawxml');
            expect(request.headers).to.deep.equal({ Accept: 'application/json' });
        });

        it('returns undefined when the policy does not exist (404)', async () => {
            sandbox.stub(AzureServiceClient.prototype, 'sendRequest').resolves({
                status: 404,
                parsedBody: undefined,
                bodyAsText: '',
                headers: {}
            });

            const result = await createService().getApiPolicy('test-api');

            expect(result).to.equal(undefined);
        });

        it('returns undefined when the response body has no properties.value', async () => {
            // Regression guard: the ARM SDK apiPolicy.get returns value undefined; the REST path must not throw on it.
            sandbox.stub(AzureServiceClient.prototype, 'sendRequest').resolves({
                status: 200,
                parsedBody: { properties: {} },
                bodyAsText: '{"properties":{}}',
                headers: {}
            });

            const result = await createService().getApiPolicy('test-api');

            expect(result).to.equal(undefined);
        });

        it('throws when the request fails with a non-404 error status', async () => {
            sandbox.stub(AzureServiceClient.prototype, 'sendRequest').resolves({
                status: 500,
                parsedBody: undefined,
                bodyAsText: 'Internal Server Error',
                headers: {}
            });

            await assertThrowsAsync(async () => createService().getApiPolicy('test-api'), Error);
        });
    });

    describe('ApiPolicyEditor.getPolicy', () => {
        function buildContext(): ITreeItemWithRoot<IApiTreeRoot> {
            return {
                root: {
                    // tslint:disable-next-line: no-any
                    credentials: {} as any,
                    environment: {
                        resourceManagerEndpointUrl: 'https://management.azure.com/'
                        // tslint:disable-next-line: no-any
                    } as any,
                    subscriptionId: 'sub-id',
                    resourceGroupName: 'test-rg',
                    serviceName: 'test-service',
                    apiName: 'test-api'
                } as IApiTreeRoot
            } as ITreeItemWithRoot<IApiTreeRoot>;
        }

        it('returns the fetched policy when one exists', async () => {
            const policyXml = '<policies><inbound><base /></inbound></policies>';
            const getApiPolicy = sandbox.stub(ApimService.prototype, 'getApiPolicy').resolves(policyXml);

            const result = await new ApiPolicyEditor().getPolicy(buildContext());

            expect(result).to.equal(policyXml);
            expect(getApiPolicy.calledOnceWith('test-api')).to.be.true;
        });

        it('falls back to the default policy when none exists', async () => {
            sandbox.stub(ApimService.prototype, 'getApiPolicy').resolves(undefined);

            const result = await new ApiPolicyEditor().getPolicy(buildContext());

            expect(result).to.equal(emptyPolicyXml);
        });
    });
});
