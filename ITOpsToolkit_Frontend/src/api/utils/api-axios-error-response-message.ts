function isNonNullObject(v: unknown): v is Record<string, unknown> {
    return v != null && typeof v === 'object';
}

function extractString(v: unknown): string | null {
    return typeof v === 'string' && v.length > 0 ? v : null;
}

function formatValidationErrors(detail: unknown[]): string | null {
    const messages = detail
        .map((entry) => {
            if (!isNonNullObject(entry)) return null;

            const msg = extractString(entry.msg);
            if (!msg) return null;

            const loc = Array.isArray(entry.loc) ? entry.loc : null;
            const fieldName = loc ? (extractString(loc.at(-1)) ?? extractString(String(loc.at(-1)))) : null;

            return fieldName ? `'${fieldName}': ${msg}` : msg;
        })
        .filter(Boolean);

    return messages.length > 0 ? messages.join('; ') : null;
}

export function getApiErrorMessage(data: unknown): string | null {
    if (data == null || typeof data !== 'object') return null;

    const d = data as Record<string, unknown>;

    // { detail: "..." } - FastAPI HTTP exceptions
    const detailStr = extractString(d.detail);
    if (detailStr) return detailStr;

    // { detail: [{ msg: "...", loc: [...] }] } - FastAPI validation errors
    if (Array.isArray(d.detail)) {
        const formatted = formatValidationErrors(d.detail);
        if (formatted) return formatted;
    }

    // { message: "..." } - common across many APIs
    const topMessage = extractString(d.message);
    if (topMessage) return topMessage;

    // { error: { ... } } - nested error object (current API shape + future fixes)
    if (isNonNullObject(d.error)) {
        // handles future-correct "message" first, falls back to current typo "messsage"
        const nestedMessage = extractString(d.error.message) ?? extractString((d.error as Record<string, unknown>)['messsage']);

        // "details" (current API shape) vs "detail" (FastAPI standard) - both handled
        const detailsArray = Array.isArray(d.error.details) ? d.error.details : Array.isArray(d.error.detail) ? d.error.detail : null;

        const detailedMessage = detailsArray ? formatValidationErrors(detailsArray) : null;

        // combine: "Payload validation failed: 'instructions': Field required"
        if (nestedMessage && detailedMessage) return `${nestedMessage}: ${detailedMessage}`;
        if (nestedMessage) return nestedMessage;
        if (detailedMessage) return detailedMessage;

        // { error: { detail: "..." } } - FastAPI behind a gateway
        const errorDetail = extractString(d.error.detail);
        if (errorDetail) return errorDetail;
    }

    // { error: "..." } - simple string error (ServiceNow table API errors)
    const errorStr = extractString(d.error);
    if (errorStr) return errorStr;

    // { error_description: "..." } - OAuth / token errors
    const oauthDesc = extractString(d.error_description);
    if (oauthDesc) return oauthDesc;

    // { result: { error: { message: "..." } } } - ServiceNow scripted REST API
    if (isNonNullObject(d.result) && isNonNullObject(d.result.error)) {
        const snowNested = extractString(d.result.error.message);
        if (snowNested) return snowNested;
    }

    return null;
}
