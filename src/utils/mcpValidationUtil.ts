/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from "../localize";

export function validateMcpServerName(value: string): string | undefined {
    if (!value || value.trim().length === 0) {
        return localize("nameRequired", "Name is required");
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 1 || trimmedValue.length > 80) {
        return localize(
            "nameLengthInvalid", 
            "Name must be between 1 and 80 characters long"
        );
    }

    const pattern = /^(\w+)$|^(\w[\w\-]+\w)$/;
    
    if (!pattern.test(trimmedValue)) {
        return localize(
            "namePatternInvalid",
            "Name can only contain letters, numbers, underscores, and hyphens. If using hyphens, the name must start and end with a letter, number, or underscore."
        );
    }

    return undefined;
}
