/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This is the external face of extension.bundle.js, the main webpack bundle for the extension.
 * Anything needing to be exposed outside of the extension sources must be exported from here, because
 * everything else will be in private modules in extension.bundle.js.
 */

// Export activate/deactivate for main.js
export { activateInternal, deactivateInternal } from './src/extension';

// Exports for tests
// The tests are not packaged with the webpack bundle and therefore only have access to code exported from this file.
//
// The tests should import '../extension.bundle.ts'. At design-time they live in tests/ and so will pick up this file (extension.bundle.ts).
// At runtime the tests live in dist/tests and will therefore pick up the main webpack bundle at dist/extension.bundle.js.
export { ext } from './src/extensionVariables';
export * from './src/constants';
export * from './src/utils/fsUtil';
export * from './src/explorer/ApiManagementProvider';
export * from './src/vsCodeConfig/settings';
export * from './src/openApi/OpenApiParser';
export * from './src/openApi/OpenApiImportObject';
export { treeUtils } from './src/utils/treeUtils';
export * from './src/utils/azure';
export * from './src/utils/nameUtil';
export * from './src/explorer/AzureAccountTreeItem';
