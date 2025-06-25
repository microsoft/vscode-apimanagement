/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IOpenApiImportObject, OpenApiParser, ext } from '../extension.bundle';
import { TestOutputChannel } from '@microsoft/vscode-azext-dev';
import {openApi2_0, openApi3_0} from './testData';

// tslint:disable: no-unsafe-any
describe('OpenAPI Parser', () => {
  before(() => {
    ext.outputChannel = new TestOutputChannel();
  });

  it('should parse OpenAPI Json 2.0 format correctly', () => {
    const parsedOpenAPI: IOpenApiImportObject = new OpenApiParser().parse(openApi2_0);
    assert.deepEqual(parsedOpenAPI.sourceDocument, openApi2_0);
    assert.equal(parsedOpenAPI.importFormat, "swagger-json");
    assert.equal(parsedOpenAPI.version, "2.0");
  });

  it('should parse OpenAPI Json > 3.0 format correctly', () => {
    const parsedOpenAPI: IOpenApiImportObject = new OpenApiParser().parse(openApi3_0);
    assert.deepEqual(parsedOpenAPI.sourceDocument, openApi3_0);
    assert.equal(parsedOpenAPI.importFormat, "openapi+json");
    assert.equal(parsedOpenAPI.version, "3.0.0");
  });

  it('should throw error for invalid OpenAPI input', () => {
    const invalidSwagger : any = {};
    assert.throws(() => new OpenApiParser().parse(invalidSwagger), /Could not parse the OpenAPI document./);
  });
});
