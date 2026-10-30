import {
    ElementNode,
    type DOMConversionMap,
    type DOMExportOutput,
    type EditorConfig,
    type LexicalEditor,
    type LexicalNode,
    type NodeKey,
    type SerializedElementNode,
    type Spread,
    isHTMLElement,
} from 'lexical';

/** Tags that should always be preserved as containers */
const SEMANTIC_TAGS = ['section', 'article', 'aside', 'header', 'footer', 'nav', 'main'] as const;

export type SerializedContainerNode = Spread<
    {
        tag: string;
        originalClass: string;
        originalStyle: string;
    },
    SerializedElementNode
>;

/**
 * A generic block container node that preserves tags like `<div>`, `<section>`,
 * `<article>`, etc. through the Lexical import/export round-trip.
 *
 * Without this node, Lexical unwraps these elements - keeping their children
 * but losing the wrapper tag and its attributes (class, style).
 */
export class ContainerNode extends ElementNode {
    __tag: string;
    __originalClass: string;
    __originalStyle: string;

    static getType(): string {
        return 'container';
    }

    static clone(node: ContainerNode): ContainerNode {
        return new ContainerNode(node.__tag, node.__originalClass, node.__originalStyle, node.__key);
    }

    constructor(tag: string, originalClass = '', originalStyle = '', key?: NodeKey) {
        super(key);
        this.__tag = tag;
        this.__originalClass = originalClass;
        this.__originalStyle = originalStyle;
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement(this.__tag);
        if (this.__originalClass) element.className = this.__originalClass;
        if (this.__originalStyle) element.style.cssText = this.__originalStyle;
        return element;
    }

    updateDOM(prevNode: ContainerNode, dom: HTMLElement): boolean {
        if (prevNode.__tag !== this.__tag) return true;
        if (prevNode.__originalClass !== this.__originalClass) dom.className = this.__originalClass;
        if (prevNode.__originalStyle !== this.__originalStyle) dom.style.cssText = this.__originalStyle;
        return false;
    }

    getTag(): string {
        return this.__tag;
    }

    getOriginalClass(): string {
        return this.__originalClass;
    }

    setOriginalClass(value: string): void {
        const writable = this.getWritable();
        writable.__originalClass = value;
    }

    getOriginalStyle(): string {
        return this.__originalStyle;
    }

    setOriginalStyle(value: string): void {
        const writable = this.getWritable();
        writable.__originalStyle = value;
    }

    static importDOM(): DOMConversionMap | null {
        const map: DOMConversionMap = {};

        // <div> - only preserve if it has class or style (plain divs fall through to default)
        map.div = (domNode: Node) => {
            if (!isHTMLElement(domNode)) return null;
            if (!domNode.getAttribute('class') && !domNode.getAttribute('style') && !domNode.getAttribute('id')) {
                return null;
            }
            return {
                conversion: (element: HTMLElement) => ({
                    node: $createContainerNode('div', element.getAttribute('class') ?? '', element.getAttribute('style') ?? ''),
                }),
                priority: 0,
            };
        };

        // Semantic containers - always preserve
        for (const tag of SEMANTIC_TAGS) {
            map[tag] = (domNode: Node) => {
                if (!isHTMLElement(domNode)) return null;
                return {
                    conversion: (element: HTMLElement) => ({
                        node: $createContainerNode(tag, element.getAttribute('class') ?? '', element.getAttribute('style') ?? ''),
                    }),
                    priority: 0,
                };
            };
        }

        return map;
    }

    exportDOM(_editor: LexicalEditor): DOMExportOutput {
        const element = document.createElement(this.__tag);
        if (this.__originalClass) element.className = this.__originalClass;
        if (this.__originalStyle) element.style.cssText = this.__originalStyle;
        return { element };
    }

    static importJSON(serializedNode: SerializedContainerNode): ContainerNode {
        return $createContainerNode(serializedNode.tag, serializedNode.originalClass, serializedNode.originalStyle);
    }

    exportJSON(): SerializedContainerNode {
        return {
            ...super.exportJSON(),
            type: 'container',
            version: 1,
            tag: this.__tag,
            originalClass: this.__originalClass,
            originalStyle: this.__originalStyle,
        };
    }

    isShadowRoot(): boolean {
        return true;
    }

    canBeEmpty(): boolean {
        return false;
    }
}

export function $createContainerNode(tag: string, originalClass = '', originalStyle = ''): ContainerNode {
    return new ContainerNode(tag, originalClass, originalStyle);
}

export function $isContainerNode(node: LexicalNode | null | undefined): node is ContainerNode {
    return node instanceof ContainerNode;
}
