/**
 * Merges original CSS classes and/or inline styles from initial HTML onto
 * Lexical-exported HTML.
 *
 * Lexical replaces all original classes with its own theme classes during
 * import/export. These helpers walk both DOMs in parallel and add back
 * the original attributes alongside the editor's.
 *
 * Elements that were added/removed during editing are left untouched.
 */

export interface MergeAttributeOptions {
    classes?: boolean;
    styles?: boolean;
    head?: boolean;
}

/**
 * Walks two element trees in parallel and merges original classes/styles
 * from `source` onto `target` elements.
 *
 * Works on both live DOM elements (editor root) and parsed DOM fragments (export).
 */
export function mergeOriginalAttributes(target: Element, source: Element, options: MergeAttributeOptions = {}): void {
    const { classes = true, styles = true } = options;

    const targetChildren = Array.from(target.children);
    const sourceChildren = Array.from(source.children);
    const len = Math.min(targetChildren.length, sourceChildren.length);

    for (let i = 0; i < len; i++) {
        const tgt = targetChildren[i];
        const src = sourceChildren[i];

        // Only merge when the tag matches - if structure diverged, skip this branch
        if (tgt.tagName !== src.tagName) continue;

        if (classes) {
            const originalClass = src.getAttribute('class');
            if (originalClass) {
                const currentClass = tgt.getAttribute('class') ?? '';
                const merged = [...new Set([...originalClass.split(/\s+/), ...currentClass.split(/\s+/)])].filter(Boolean).join(' ');
                tgt.setAttribute('class', merged);
            }
        }

        if (styles) {
            const originalStyle = src.getAttribute('style');
            if (originalStyle) {
                const currentStyle = tgt.getAttribute('style') ?? '';
                tgt.setAttribute('style', mergeInlineStyles(originalStyle, currentStyle));
            }
        }

        // Recurse into children
        mergeOriginalAttributes(tgt, src, options);
    }
}

/**
 * Merges two inline style strings.
 * Properties from `priority` override those from `base` on conflict.
 */
export function mergeInlineStyles(base: string, priority: string): string {
    const map = new Map<string, string>();

    for (const decl of base.split(';')) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) continue;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl.slice(colonIdx + 1).trim();
        if (prop && value) map.set(prop, value);
    }

    for (const decl of priority.split(';')) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) continue;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl.slice(colonIdx + 1).trim();
        if (prop && value) map.set(prop, value);
    }

    return Array.from(map.entries())
        .map(([prop, value]) => `${prop}: ${value}`)
        .join('; ');
}

/** Merges original attributes into an exported body HTML string */
export function mergeOriginalBodyHtml(exportedBodyHtml: string, originalBodyHtml: string, options: MergeAttributeOptions = {}): string {
    if (!originalBodyHtml) return exportedBodyHtml;

    const parser = new DOMParser();
    const exportedDoc = parser.parseFromString(`<body>${exportedBodyHtml}</body>`, 'text/html');
    const originalDoc = parser.parseFromString(`<body>${originalBodyHtml}</body>`, 'text/html');

    mergeOriginalAttributes(exportedDoc.body, originalDoc.body, options);
    return exportedDoc.body.innerHTML;
}
