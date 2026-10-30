import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SELECTION_CHANGE_COMMAND, $setSelection, $createRangeSelectionFromDom } from 'lexical';

/**
 * Bridges selection handling from Shadow DOM to Lexical.
 *
 * **Problem:** Lexical registers `selectionchange` on `document` and reads
 * selection via `window.getSelection()`. Neither works reliably inside Shadow
 * DOM - `selectionchange` may not fire on `document` for shadow-internal
 * selections, and `window.getSelection()` doesn't return selections from within
 * shadow trees in most browsers.
 *
 * **Solution** (based on facebook/lexical#7790):
 * 1. Listen for `selectionchange` on the shadow root (+ mouseup/keyup fallback)
 * 2. Use `Selection.getComposedRanges({ shadowRoots })` - the modern API that
 *    CAN read selections inside shadow DOM
 * 3. Create a Selection-like proxy from the composed ranges
 * 4. Feed that into Lexical's `$createRangeSelectionFromDom` to sync its model
 *
 * No-op when the editor is not inside Shadow DOM.
 */

/**
 * Gets a Selection-like object that works inside Shadow DOM by using
 * `getComposedRanges()` when available, falling back to `window.getSelection()`.
 */
function getShadowDomSelection(shadowRoot: ShadowRoot): Selection | null {
    const globalSelection = window.getSelection();
    if (!globalSelection) return null;

    // Use getComposedRanges if available (Chrome 125+, Firefox 132+, Safari 17+)
    if ('getComposedRanges' in Selection.prototype) {
        try {
            const ranges = (
                globalSelection as unknown as {
                    getComposedRanges(options: { shadowRoots: ShadowRoot[] }): StaticRange[];
                }
            ).getComposedRanges({ shadowRoots: [shadowRoot] });

            if (ranges.length > 0) {
                return createSelectionProxy(globalSelection, ranges);
            }
        } catch {
            // getComposedRanges not supported or errored - fall through
        }
    }

    return globalSelection;
}

/**
 * Creates a Selection-like proxy that returns anchor/focus from composed ranges.
 * This is necessary because `window.getSelection()` properties don't reflect
 * the actual selection inside shadow DOM, but `getComposedRanges()` does.
 */
function createSelectionProxy(baseSelection: Selection, composedRanges: StaticRange[]): Selection {
    const firstRange = composedRanges[0];

    // Use a Proxy to intercept anchor/focus property reads
    return new Proxy(baseSelection, {
        get(target, prop, receiver) {
            switch (prop) {
                case 'anchorNode':
                    return firstRange.startContainer;
                case 'anchorOffset':
                    return firstRange.startOffset;
                case 'focusNode':
                    return firstRange.endContainer;
                case 'focusOffset':
                    return firstRange.endOffset;
                case 'isCollapsed':
                    return firstRange.collapsed;
                case 'rangeCount':
                    return composedRanges.length;
                case 'type':
                    return firstRange.collapsed ? 'Caret' : 'Range';
                case 'getRangeAt':
                    return function (index: number) {
                        if (index < 0 || index >= composedRanges.length) {
                            throw new DOMException('Index out of range', 'IndexSizeError');
                        }
                        const staticRange = composedRanges[index];
                        const range = document.createRange();
                        range.setStart(staticRange.startContainer, staticRange.startOffset);
                        range.setEnd(staticRange.endContainer, staticRange.endOffset);
                        return range;
                    };
                default: {
                    const value = Reflect.get(target, prop, receiver);
                    return typeof value === 'function' ? value.bind(target) : value;
                }
            }
        },
    });
}

export default function ShadowDomSelectionPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const rootElement = editor.getRootElement();
        if (!rootElement) return;

        const rootNode = rootElement.getRootNode();
        if (!(rootNode instanceof ShadowRoot)) return;

        let isSyncing = false;

        const syncSelection = () => {
            if (isSyncing) return;
            isSyncing = true;

            try {
                const domSelection = getShadowDomSelection(rootNode);
                if (!domSelection || domSelection.rangeCount === 0) return;

                const anchorNode = domSelection.anchorNode;
                if (!anchorNode || !rootElement.contains(anchorNode)) return;

                editor.update(
                    () => {
                        const lexicalSelection = $createRangeSelectionFromDom(domSelection, editor);
                        if (lexicalSelection !== null) {
                            $setSelection(lexicalSelection);
                        }
                    },
                    { discrete: true },
                );

                editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
            } finally {
                isSyncing = false;
            }
        };

        // Listen on shadow root for selectionchange
        rootNode.addEventListener('selectionchange', syncSelection);

        // Fallback: mouseup/keyup on editor root - covers browsers where
        // selectionchange doesn't fire on shadow roots
        rootElement.addEventListener('mouseup', syncSelection);
        rootElement.addEventListener('keyup', syncSelection);

        // Also catch selection changes that fire on document (some browsers)
        const onDocSelectionChange = () => {
            const domSelection = getShadowDomSelection(rootNode);
            if (!domSelection) return;
            const anchorNode = domSelection.anchorNode;
            if (anchorNode && rootElement.contains(anchorNode)) {
                syncSelection();
            }
        };
        document.addEventListener('selectionchange', onDocSelectionChange);

        return () => {
            rootNode.removeEventListener('selectionchange', syncSelection);
            rootElement.removeEventListener('mouseup', syncSelection);
            rootElement.removeEventListener('keyup', syncSelection);
            document.removeEventListener('selectionchange', onDocSelectionChange);
        };
    }, [editor]);

    return null;
}
