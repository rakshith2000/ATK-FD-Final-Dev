import {
    ElementNode,
    type DOMConversionMap,
    type DOMExportOutput,
    type EditorConfig,
    type LexicalEditor,
    type LexicalNode,
    type NodeKey,
    type RangeSelection,
    ParagraphNode,
    type SerializedElementNode,
    type Spread,
    isHTMLElement,
} from 'lexical';

export type SerializedCodeBlockNode = Spread<
    {
        language: string | null | undefined;
    },
    SerializedElementNode
>;

export class CodeBlockNode extends ElementNode {
    __language: string | null | undefined;

    static getType(): string {
        return 'code-block';
    }

    static clone(node: CodeBlockNode): CodeBlockNode {
        return new CodeBlockNode(node.__language, node.__key);
    }

    constructor(language?: string | null | undefined, key?: NodeKey) {
        super(key);
        this.__language = language || null;
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const pre = document.createElement('pre');
        pre.className = 'editor-code-block';
        pre.style.backgroundColor = '#1e1e1e';
        pre.style.color = '#f8f8f2';
        pre.style.padding = '1rem';
        pre.style.overflowX = 'auto';
        pre.style.borderRadius = '4px';
        pre.style.fontFamily = 'Menlo, Monaco, Consolas, monospace';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-word';
        return pre;
    }

    updateDOM(prevNode: CodeBlockNode, dom: HTMLElement): boolean {
        if (prevNode.__language !== this.__language) {
            dom.dataset.language = this.__language ?? '';
        }
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            pre: (domNode) => {
                if (isHTMLElement(domNode) && domNode.firstElementChild?.tagName.toLowerCase() === 'code') {
                    return {
                        conversion: () => ({ node: $createCodeBlockNode() }),
                        priority: 0,
                    };
                }
                return null;
            },
        };
    }

    exportDOM(_editor: LexicalEditor): DOMExportOutput {
        const element = document.createElement('pre');
        element.className = 'editor-code-block';
        return { element };
    }

    static importJSON(serializedNode: SerializedCodeBlockNode): CodeBlockNode {
        return $createCodeBlockNode(serializedNode.language);
    }

    exportJSON(): SerializedCodeBlockNode {
        return {
            type: 'code-block',
            version: 1,
            language: this.__language,
            direction: null,
            format: '',
            indent: 0,
            textStyle: '',
            children: [],
        };
    }

    insertNewAfter(_selection: RangeSelection, restoreSelection?: boolean): ParagraphNode {
        const paragraph = new ParagraphNode();
        if (restoreSelection) {
            paragraph.select();
        }
        return paragraph;
    }
}

export function $createCodeBlockNode(language?: string | null | undefined): CodeBlockNode {
    return new CodeBlockNode(language);
}

export function $isCodeBlockNode(node: LexicalNode | null | undefined): node is CodeBlockNode {
    return node instanceof CodeBlockNode;
}
