import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { registerRichText } from '@lexical/rich-text';
import { registerLink } from '@lexical/link';
import { registerList } from '@lexical/list';
import { registerTablePlugin, $getTableCellNodeFromLexicalNode, $getTableNodeFromLexicalNodeOrThrow } from '@lexical/table';
import { namedSignals } from '@lexical/extension';
import { $createParagraphNode, $getSelection, $isRangeSelection, KEY_ESCAPE_COMMAND, COMMAND_PRIORITY_LOW, type LexicalEditor } from 'lexical';
import type { EditorExtensionsOptions } from '../RichTextEditorContext';

interface EditorExtensionsPluginProps {
    isEditable: boolean;
    extensions?: EditorExtensionsOptions;
    onEditorReady?: (editor: LexicalEditor) => void;
}

const DEFAULT_EXTENSIONS: EditorExtensionsOptions = {
    richText: true,
    link: true,
    list: true,
    table: true,
};

export default function EditorExtensionsPlugin({ isEditable, extensions, onEditorReady }: EditorExtensionsPluginProps): null {
    const [editor] = useLexicalComposerContext();

    const resolvedExtensions = { ...DEFAULT_EXTENSIONS, ...extensions };

    useEffect(() => {
        onEditorReady?.(editor);
    }, [editor, onEditorReady]);

    useEffect(() => {
        editor.setEditable(isEditable);
    }, [editor, isEditable]);

    useEffect(() => {
        const cleanups: Array<() => void> = [];

        if (resolvedExtensions.richText) {
            cleanups.push(registerRichText(editor));
        }

        if (resolvedExtensions.link) {
            cleanups.push(
                registerLink(
                    editor,
                    namedSignals({
                        validateUrl: undefined,
                        attributes: undefined,
                    }),
                ),
            );
        }

        if (resolvedExtensions.list) {
            cleanups.push(registerList(editor));
        }

        if (resolvedExtensions.table) {
            cleanups.push(registerTablePlugin(editor));
        }

        return mergeRegister(...cleanups);
    }, [editor, resolvedExtensions.richText, resolvedExtensions.link, resolvedExtensions.list, resolvedExtensions.table]);

    // Allow pressing Escape inside a table to insert a paragraph after it and move the cursor there
    useEffect(() => {
        if (!resolvedExtensions.table) return;
        return editor.registerCommand(
            KEY_ESCAPE_COMMAND,
            () => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) return false;
                const cellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
                if (!cellNode) return false;
                const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
                const paragraph = $createParagraphNode();
                tableNode.insertAfter(paragraph);
                paragraph.selectStart();
                return true;
            },
            COMMAND_PRIORITY_LOW,
        );
    }, [editor, resolvedExtensions.table]);

    return null;
}
