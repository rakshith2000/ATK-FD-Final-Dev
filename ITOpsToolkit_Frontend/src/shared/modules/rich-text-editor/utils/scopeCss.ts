/**
 * Scopes CSS rules so they only apply within a given selector.
 *
 * Uses the browser's CSSOM (`new CSSStyleSheet().replaceSync()`) to parse
 * the CSS, then prefixes every style-rule selector with `scopeSelector`.
 * Media queries are recursed into; @font-face / @keyframes / etc. pass through as-is.
 */

function prefixRules(rules: CSSRuleList, scope: string): string {
    return Array.from(rules)
        .map((rule) => {
            if (rule instanceof CSSStyleRule) {
                const prefixed = rule.selectorText
                    .split(',')
                    .map((s) => `${scope} ${s.trim()}`)
                    .join(', ');
                return `${prefixed} { ${rule.style.cssText} }`;
            }
            if (rule instanceof CSSMediaRule) {
                return `@media ${rule.conditionText} {\n${prefixRules(rule.cssRules, scope)}\n}`;
            }
            // @font-face, @keyframes, @import, etc. - keep unchanged
            return rule.cssText;
        })
        .join('\n');
}

export function scopeCss(css: string, scopeSelector: string): string {
    if (!css.trim()) return '';
    try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        return prefixRules(sheet.cssRules, scopeSelector);
    } catch {
        return '';
    }
}
