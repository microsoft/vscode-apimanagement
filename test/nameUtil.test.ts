/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { nameUtil } from '../extension.bundle';
import { IApiTreeRoot } from '../src/explorer/IApiTreeRoot';
import { IOperationTreeRoot } from '../src/explorer/IOperationTreeRoot';
import { IServiceTreeRoot } from '../src/explorer/IServiceTreeRoot';

// tslint:disable: no-unsafe-any
describe('Name Util', () => {
    it('should correctly format service root name', async () => {
        const name : string = nameUtil(<IServiceTreeRoot>{ serviceName : "apim-service"  });
        assert.equal(name, "apim-service");
    });

    it('should correctly format operation root name', async () => {
        const name : string = nameUtil(<IOperationTreeRoot>{ serviceName : "apim-service", apiName: "apim-api", opName: "apim-op" });
        assert.equal(name, "apim-service-apim-api-apim-op");
    });

    it('should correctly format API root name', async () => {
        const name : string = nameUtil(<IApiTreeRoot>{ serviceName : "apim-service", apiName: "apim-api"});
        assert.equal(name, "apim-service-apim-api");
    });
});
