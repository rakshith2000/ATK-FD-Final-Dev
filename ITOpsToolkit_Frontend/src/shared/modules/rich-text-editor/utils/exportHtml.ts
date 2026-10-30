import { $getRoot, type LexicalEditor } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import logger from '@/shared/utils/logger';
import css from '../themes/default/default-style.css?raw';
import { sanitizeHtml } from './sanitizeHtml';
import { mergeOriginalBodyHtml, mergeInlineStyles, type MergeAttributeOptions } from './mergeOriginalClasses';
import { normalizeFontSize, normalizeFontFamily, DEFAULT_FONT_FAMILY } from '../config/style-config';

// ---------------------------------------------------------------------------
// CSS rule parsing & content-aware filtering
// ---------------------------------------------------------------------------

interface CssRule {
    selector: string;
    body: string;
    /** Base class names referenced in the selector (e.g. "editor-table") */
    classes: string[];
}

/** Selectors that are editor-internal and should never appear in exported HTML */
const SKIP_PATTERNS = ['tree-view-output', '::-webkit-scrollbar'];

function parseCssRules(rawCss: string): CssRule[] {
    const rules: CssRule[] = [];
    const cleaned = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');

    let i = 0;
    while (i < cleaned.length) {
        const openBrace = cleaned.indexOf('{', i);
        if (openBrace === -1) break;

        const closeBrace = cleaned.indexOf('}', openBrace);
        if (closeBrace === -1) break;

        const selector = cleaned.slice(i, openBrace).trim();
        const body = cleaned.slice(openBrace + 1, closeBrace).trim();

        i = closeBrace + 1;

        if (!body) continue;
        if (SKIP_PATTERNS.some((p) => selector.includes(p))) continue;

        const classes = [...new Set((selector.match(/\.([\w-]+)/g) ?? []).map((m) => m.slice(1)))];
        if (classes.length > 0) {
            rules.push({ selector, body, classes });
        }
    }
    return rules;
}

/** Pre-parse at module load time so we pay the cost only once */
const allRules = parseCssRules(css);

function minifyRule(selector: string, body: string): string {
    const s = selector
        .split(',')
        .map((p) => p.trim().replace(/\s{2,}/g, ' '))
        .join(',');
    const b = body
        .replace(/\s+/g, ' ')
        .replace(/ ([{}:;,])/g, '$1')
        .replace(/([{}:;,]) /g, '$1')
        .replace(/;$/, '')
        .trim();
    return `${s}{${b}}`;
}

/**
 * Build a minimal CSS string containing only rules whose classes appear in `html` or `extraClasses`.
 * This keeps the exported document lean - no scrollbar / debug / unused heading CSS.
 */
function buildCssForContent(html: string, extraClasses: string[] = []): string {
    const parts: string[] = [];
    for (const rule of allRules) {
        if (rule.classes.some((cls) => html.includes(cls) || extraClasses.includes(cls))) {
            parts.push(minifyRule(rule.selector, rule.body));
        }
    }
    return parts.join('');
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildAttrString(attrs: Record<string, string>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(attrs)) {
        if (value) parts.push(`${key}="${value}"`);
    }
    return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

export interface ExportOptions {
    /** Original <head> innerHTML to preserve */
    initialHeadContent?: string;
    /** Original sanitized body innerHTML for class/style merging */
    originalBodyHtml?: string;
    /** Original attributes from the <body> tag (class, style) */
    originalBodyAttrs?: Record<string, string>;
    /** Which original attributes to merge back */
    preserve?: MergeAttributeOptions;
    /** Mapping dictionary from local blob URLs to original SNOW attachment URLs */
    urlMap?: Record<string, string>;
    /** Default editor font size in px */
    defaultFontSize?: number | string;
    /** Default editor font family */
    defaultFontFamily?: string;
}

export function exportEditorHtml(editor: LexicalEditor, options: ExportOptions = {}): string {
    const { initialHeadContent = '', originalBodyHtml = '', originalBodyAttrs = {}, preserve = {}, urlMap = {}, defaultFontSize, defaultFontFamily } = options;

    let exportedHtml = '';
    editor.getEditorState().read(() => {
        try {
            exportedHtml = $generateHtmlFromNodes(editor);
        } catch (error) {
            logger.error('Failed to export editor HTML via Lexical HTML helper; falling back to text-only export.', error);
            const root = $getRoot();
            const textContent = root.getTextContent();
            exportedHtml = textContent
                .split(/\r?\n/)
                .map((line) => `<p>${escapeHtml(line)}</p>`)
                .join('');
        }
    });

    const cleanHtml = sanitizeHtml(exportedHtml);

    // Merge original classes/styles back onto exported body elements
    const shouldMerge = preserve.classes || preserve.styles;
    let bodyHtml = shouldMerge ? mergeOriginalBodyHtml(cleanHtml, originalBodyHtml, preserve) : cleanHtml;

    // Swap temporary local blob URLs back to original SNOW attachment paths
    for (const [blobUrl, snowPath] of Object.entries(urlMap)) {
        if (blobUrl && snowPath) {
            bodyHtml = bodyHtml.replaceAll(blobUrl, snowPath);
        }
    }

    const resolvedFontSize = normalizeFontSize(defaultFontSize);
    const resolvedFontFamily = defaultFontFamily ? normalizeFontFamily(defaultFontFamily) : DEFAULT_FONT_FAMILY;

    let editorStyles = buildCssForContent(bodyHtml, ['editor-body']);
    if (editorStyles) {
        editorStyles = editorStyles.replace(/var\(--rte-font-size[^)]*\)/g, `${resolvedFontSize}px`).replace(/var\(--rte-font-family[^)]*\)/g, `${resolvedFontFamily}, sans-serif`);
    }
    const editorStyleTag = editorStyles ? `<style>${editorStyles}</style>` : '';

    // Head: merge original head content with editor styles
    const headContent = preserve.head ? [initialHeadContent, editorStyleTag].filter(Boolean).join('') : editorStyleTag;
    const fallbackMeta = headContent.includes('<meta') ? '' : '<meta charset="utf-8"/>';

    // Body tag: include editor-body class and font styles, merged with original attributes if preserving
    const bodyAttrs: Record<string, string> = {};
    const baseClasses = ['editor-body'];
    if (preserve.classes && originalBodyAttrs.class) {
        baseClasses.push(...originalBodyAttrs.class.split(/\s+/));
    }
    bodyAttrs.class = [...new Set(baseClasses)].filter(Boolean).join(' ');

    const defaultBodyStyle = `font-family: ${resolvedFontFamily}, sans-serif; font-size: ${resolvedFontSize}px;`;
    if (preserve.styles && originalBodyAttrs.style) {
        bodyAttrs.style = mergeInlineStyles(defaultBodyStyle, originalBodyAttrs.style);
    } else {
        bodyAttrs.style = defaultBodyStyle;
    }

    return `<!DOCTYPE html><html><head>${fallbackMeta}${headContent}</head><body${buildAttrString(bodyAttrs)}>${bodyHtml}</body></html>`;
}
