import type { KnowledgeArticle } from '../types/knowledge-browser';

/** Formats a ServiceNow datetime (e.g. "2025-08-29 01:04:56") into a short date like "29 Aug 2025". */
export function formatArticleDate(raw: string | null | undefined, fallback = 'N/A'): string {
    if (!raw) return fallback;
    // ServiceNow uses "YYYY-MM-DD HH:mm:ss"; normalise the space to make it ISO-parseable.
    const date = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Returns the numeric rating label, or "N/A" when the article has no usable rating. */
export function formatArticleRating(raw: string | null | undefined): string {
    if (!raw) return 'N/A';
    const rating = Number(raw);
    if (Number.isNaN(rating) || rating <= 0) return 'N/A';
    return String(rating);
}

/** Strips HTML tags and collapses whitespace to build a plain-text preview from the article body. */
export function htmlToPreviewText(html: string | null | undefined, maxLength = 140): string {
    if (!html) return '';
    const text = html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();

    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}...`;
}

/** Builds a stable, unique key for an article (falls back to sys_id, then number). */
export function getArticleKey(article: KnowledgeArticle): string {
    return article.sys_id?.value || article.number?.value || article.number?.display_value || '';
}
