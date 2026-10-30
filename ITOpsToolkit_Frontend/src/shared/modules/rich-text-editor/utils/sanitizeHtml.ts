import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
    // Structure
    'div',
    'span',
    'p',
    'br',
    'hr',
    // Semantic sections
    'section',
    'article',
    'aside',
    'header',
    'footer',
    'nav',
    'main',
    // Headings
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // Inline formatting
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'ins',
    'sub',
    'sup',
    'mark',
    'code',
    'small',
    'abbr',
    'cite',
    'dfn',
    'kbd',
    'samp',
    'var',
    'q',
    'time',
    'data',
    'bdi',
    'bdo',
    'wbr',
    'ruby',
    'rt',
    'rp',
    // Address
    'address',
    // Lists
    'ul',
    'ol',
    'li',
    // Definition lists
    'dl',
    'dt',
    'dd',
    // Tables
    'table',
    'caption',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
    // Media
    'img',
    'picture',
    'source',
    'video',
    'audio',
    // Links
    'a',
    // Block
    'blockquote',
    'pre',
    'figure',
    'figcaption',
    'details',
    'summary',
    //
    'font',
    'center',
];

const ALLOWED_ATTRS = [
    'class',
    'style',
    'dir',
    'id',
    'title',
    'lang',
    // Links
    'href',
    'target',
    'rel',
    'name',
    // Images & media
    'src',
    'alt',
    'width',
    'height',
    'controls',
    'poster',
    'type',
    'media',
    'srcset',
    'sizes',
    // Tables
    'colspan',
    'rowspan',
    'scope',
    'headers',
    //  table/layout attributes
    'align',
    'valign',
    'bgcolor',
    'border',
    'cellpadding',
    'cellspacing',
    // font attributes
    'color',
    'face',
    'size',
    // Lists
    'start',
    'reversed',
    // Time / ins / del
    'datetime',
    'cite',
    // Abbreviation
    'abbr',
    // Details
    'open',
    // Data attributes used by Lexical
    'data-lexical-decorator',
    'data-lexical-text',
    // Image alignment
    'data-alignment',
];

export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR: ALLOWED_ATTRS,
        ALLOW_DATA_ATTR: true,
        ADD_ATTR: ['target', 'data-alignment'],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|file|data|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
        RETURN_TRUSTED_TYPE: false,
    }) as string;
}
