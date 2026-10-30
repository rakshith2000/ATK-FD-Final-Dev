/** Valid template source prefixes - every {token} MUST use one of these */
const VALID_PREFIXES = ['meta', 'field', 'initialValue', 'response'] as const;

/** Bare tokens that are allowed without a prefix (special runtime placeholders) */
const ALLOWED_BARE_TOKENS = new Set(['searchTerm']);

/** Check if a token uses a valid prefix (e.g. "meta:ticketId", "response:name").
 *  Bare tokens (no prefix) are NOT valid unless whitelisted. */
function isValidPrefixedToken(token: string): boolean {
    const colonIdx = token.indexOf(':');
    if (colonIdx < 0) return ALLOWED_BARE_TOKENS.has(token);
    const prefix = token.slice(0, colonIdx);
    return (VALID_PREFIXES as readonly string[]).includes(prefix);
}

/** Validate template syntax in a single string value.
 *  Returns an error string or undefined if valid.
 *  Checks: unmatched braces, empty `{}`, nested braces `{{}}`,
 *  bare tokens without prefix, and invalid prefixes. */
export function validateTemplateString(value: string): string | undefined {
    if (typeof value !== 'string' || !value) return undefined;
    if (/\{\s*\}/.test(value)) return 'empty placeholder {}';
    if (/\{\{/.test(value) || /\}\}/.test(value)) return 'nested braces not allowed';
    let depth = 0;
    for (const ch of value) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        if (depth < 0) return 'unexpected closing brace';
        if (depth > 1) return 'nested braces not allowed';
    }
    if (depth !== 0) return 'unclosed brace';

    // Validate all tokens have valid prefixes - bare {key} is an error
    for (const m of value.matchAll(/\{([^}]{1,500})\}/g)) {
        const token = m[1];
        if (!isValidPrefixedToken(token)) {
            const colonIdx = token.indexOf(':');
            if (colonIdx < 0) {
                return `bare "{${token}}" requires a prefix - use {meta:${token}}, {field:${token}}, {response:${token}}, or {initialValue:${token}}`;
            }
            const prefix = token.slice(0, colonIdx);
            return `unknown prefix "${prefix}:" - valid: ${VALID_PREFIXES.map((p) => `${p}:`).join(', ')}`;
        }
    }
    return undefined;
}

/** Validate that a key string uses `{response:field}` syntax.
 *  Bare strings like `name` should be wrapped as `{response:name}`.
 *  Returns a warning string or undefined if valid. */
export function validateKeyTemplate(value: string): string | undefined {
    if (!value) return undefined;
    const syntaxError = validateTemplateString(value);
    if (syntaxError) return syntaxError;
    if (!/\{[^}]{1,500}\}/.test(value)) return `use {response:${value}} instead of bare "${value}"`;
    return undefined;
}

/** Validate template syntax in all values of a mapping Record.
 *  Returns an error string (with the key) or undefined if all valid. */
export function validateTemplates(mapping: Record<string, unknown>): string | undefined {
    for (const [key, val] of Object.entries(mapping)) {
        if (typeof val === 'string') {
            const err = validateTemplateString(val);
            if (err) return `"${key}": ${err}`;
        } else if (val && typeof val === 'object') {
            const err = validateTemplates(val as Record<string, unknown>);
            if (err) return `"${key}": ${err}`;
        }
    }
    return undefined;
}

/** Extract all template tokens from a string, categorized by source prefix.
 *  Returns an object with arrays of keys for each prefix type.
 *  Bare tokens (without prefix) are not extracted - they are validation errors. */
export function extractTemplateSources(value: string): Record<string, string[]> {
    const sources: Record<string, string[]> = {};
    if (typeof value !== 'string') return sources;
    for (const m of value.matchAll(/\{([^}]{1,500})\}/g)) {
        const token = m[1];
        const colonIdx = token.indexOf(':');
        if (colonIdx >= 0) {
            const prefix = token.slice(0, colonIdx);
            const key = token.slice(colonIdx + 1);
            (sources[prefix] ??= []).push(key);
        }
    }
    return sources;
}
