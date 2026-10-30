import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaCheckCircle, FaBold, FaItalic, FaUnderline, FaListOl, FaListUl, FaCode, FaUndo, FaRedo, FaMinus, FaTimes, FaShieldAlt, FaWrench } from 'react-icons/fa';
import { BsDiagram3, BsFileEarmarkText } from 'react-icons/bs';
import { MdFormatQuote } from 'react-icons/md';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { twMerge } from 'tailwind-merge';
import { useNavigate } from '@tanstack/react-router';
import { SOP_QUERY_KEYS } from '../../constants/query-keys';
import fasteaiApiClient from '@/api/axios-clients/fasteai/fasteai-api-client';
import { sopTextToHtml, extractSOPContentText, validateMandatorySections } from '../../utils/sopFormatting';
import SOPContentActions from '../ui/SopContentActions';
import SOPWorkflowDiagram, { type WorkflowItem } from './SopWorkflowDiagram';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { ateFetch, SOP_GENERATION_BASE } from '@/api/ateAuth';

type SopMessageContent =
    | string
    | {
          text?: string;
          content?: string;
          message?: string;
          body?: string;
          workflow?: WorkflowItem[];
      }
    | null;

interface SopMessage {
    role: 'assistant' | 'user' | 'error';
    sop_content?: unknown;
    content?: SopMessageContent;
    workflow?: WorkflowItem[];
    u_sop_type?: string;
    sop_type?: string;
    is_complete?: boolean;
}

interface SopDocumentPreviewProps {
    messages: SopMessage[];
    isGenerating: boolean;
    sopData?: {
        id?: string;
        sop_name?: string;
        sop_content?: string;
        category?: string;
        is_approved?: string;
        created_by?: string;
        u_sop_type?: string;
        sop_type?: string;
        workflow?: WorkflowItem[];
    } | null;
    onApproveSuccess?: () => void;
    onPreCheck?: () => void;
    onContentChange?: (content: string) => void;
    sessionId?: string | null;
}

export default function SopDocumentPreview({ messages, isGenerating, sopData = null, onApproveSuccess, onPreCheck, onContentChange, sessionId }: SopDocumentPreviewProps) {
    const navigate = useNavigate();
    const { getUser } = useAuth();
    const authUser = getUser();
    const currentUser = authUser?.userSnowDetails?.user_name || authUser?.username || authUser?.displayName || 'User';
    const [hasContent, setHasContent] = useState(false);
    const [viewMode, setViewMode] = useState<'full' | 'workflow'>('full');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');
    const [currentRawContent, setCurrentRawContent] = useState('');
    const [workflowData, setWorkflowData] = useState<WorkflowItem[]>([]);
    const [isPreChecking, setIsPreChecking] = useState(false);
    const [isInjectingTools, setIsInjectingTools] = useState(false);
    const [hasRunPreCheck, setHasRunPreCheck] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const lastAgentContentRef = useRef('');
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isGenerating) {
            setIsPreChecking(false);
        }
    }, [isGenerating]);

    const handlePreCheckClick = () => {
        setIsPreChecking(true);
        setHasRunPreCheck(true);
        if (onPreCheck) onPreCheck();
    };

    const handleInjectTools = async () => {
        const text = getEditorText();
        if (!text.trim()) return;
        setIsInjectingTools(true);
        try {
            const res = await ateFetch(`${SOP_GENERATION_BASE}/api/map-mcp-tools`, SOP_GENERATION_BASE, {
                method: 'POST',
                data: { sop_content: text, session_id: sessionId },
            });
            if (res.data?.sop_content) {
                let newContent = res.data.sop_content;
                newContent = newContent
                    .replace(/^```[a-z0-9_-]*\s*/i, '')
                    .replace(/```\s*$/i, '')
                    .trim();

                setCurrentRawContent(newContent);
                if (onContentChange) onContentChange(newContent);
                syncEditorDOM(newContent);

                setToastMessage('Successfully mapped MCP tools to SOP.');
                setToastVariant('success');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            }
        } catch {
            setToastMessage('Failed to map MCP tools.');
            setToastVariant('danger');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setIsInjectingTools(false);
        }
    };

    const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

    const getWorkflowFromPayload = useCallback((payload: unknown): WorkflowItem[] => {
        if (!isRecord(payload)) return [];
        if (Array.isArray(payload.workflow) && payload.workflow.length > 0) return payload.workflow as WorkflowItem[];
        if (isRecord(payload.content) && Array.isArray(payload.content.workflow) && payload.content.workflow.length > 0) return payload.content.workflow as WorkflowItem[];
        if (isRecord(payload.sop_content) && Array.isArray(payload.sop_content.workflow) && payload.sop_content.workflow.length > 0)
            return payload.sop_content.workflow as WorkflowItem[];

        const targets = [payload.sop_content, payload.content];
        for (const t of targets) {
            if (typeof t === 'string' && t.trim().startsWith('{')) {
                try {
                    const parsed: unknown = JSON.parse(t);
                    if (isRecord(parsed) && Array.isArray(parsed.workflow) && parsed.workflow.length > 0) return parsed.workflow as WorkflowItem[];
                    if (isRecord(parsed) && isRecord(parsed.content) && Array.isArray(parsed.content.workflow)) return parsed.content.workflow as WorkflowItem[];
                    if (isRecord(parsed) && isRecord(parsed.sop_content) && Array.isArray(parsed.sop_content.workflow)) return parsed.sop_content.workflow as WorkflowItem[];
                } catch {}
            }
        }
        return [];
    }, []);

    const syncEditorDOM = useCallback((content: string) => {
        if (editorRef.current && content) {
            const cleanContent = content
                .replace(/```(?:workflow|scheduled_workflow_diagram)[\s\S]*?```/gi, '')
                .replace(/(?:\n|^)(?:Workflow|Scheduled_Workflow_Diagram)\s*:\s*\[[\s\S]*$/gi, '')
                .trim();
            editorRef.current.innerHTML = sopTextToHtml(cleanContent);
        }
    }, []);

    useEffect(() => {
        if (sopData?.sop_content) {
            const textContent = extractSOPContentText(sopData.sop_content);
            lastAgentContentRef.current = textContent;
            setCurrentRawContent(textContent);
            setHasContent(Boolean(textContent.trim()));
            syncEditorDOM(textContent);

            const workflow = getWorkflowFromPayload(sopData);
            if (workflow.length > 0) setWorkflowData(workflow);
        }
    }, [sopData, getWorkflowFromPayload, syncEditorDOM]);

    useEffect(() => {
        if (messages.length === 0) {
            if (editorRef.current) editorRef.current.innerHTML = '';
            lastAgentContentRef.current = '';
            setCurrentRawContent('');
            setHasContent(false);
            setWorkflowData([]);
            return;
        }

        const assistantMessages = messages.filter((m) => m.role === 'assistant');

        for (let i = assistantMessages.length - 1; i >= 0; i--) {
            const wf = getWorkflowFromPayload(assistantMessages[i]);
            if (wf && wf.length > 0) {
                setWorkflowData(wf);
                break;
            }
        }

        if (assistantMessages.length > 0) {
            const latest = assistantMessages[assistantMessages.length - 1];
            const rawContent = extractSOPContentText(latest.sop_content || latest.content);

            if (rawContent && rawContent.trim() && rawContent !== lastAgentContentRef.current) {
                lastAgentContentRef.current = rawContent;
                setCurrentRawContent(rawContent);
                syncEditorDOM(rawContent);
                setHasContent(true);
            }
        }
    }, [messages, getWorkflowFromPayload, syncEditorDOM]);

    useEffect(() => {
        if (viewMode === 'full' && lastAgentContentRef.current) {
            setTimeout(() => {
                syncEditorDOM(lastAgentContentRef.current);
            }, 0);
        }
    }, [viewMode, syncEditorDOM]);

    const getEditorText = useCallback(() => {
        return editorRef.current?.innerText || editorRef.current?.textContent || currentRawContent;
    }, [currentRawContent]);

    const handleEditorInput = useCallback(() => {
        const text = editorRef.current?.innerText?.trim() || '';
        setHasContent(text.length > 0);
        const newRawContent = getEditorText();
        setCurrentRawContent(newRawContent);
        if (onContentChange) onContentChange(newRawContent);
    }, [getEditorText, onContentChange]);

    const execCmd = useCallback(
        (e: React.MouseEvent, cmd: string, value: string | null = null) => {
            e.preventDefault();
            e.stopPropagation();

            const editor = editorRef.current;
            if (!editor) return;

            editor.focus();

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                const range = document.createRange();
                range.selectNodeContents(editor);
                range.collapse(false);
                selection?.removeAllRanges();
                selection?.addRange(range);
            }

            let formattedValue = value;
            if (cmd === 'formatBlock' && value) {
                formattedValue = value.startsWith('<') ? value : `<${value}>`;
            }

            try {
                document.execCommand(cmd, false, formattedValue ?? undefined);
            } catch {
                // Fallback for strict browser restrictions on formatBlock
                if (cmd === 'formatBlock' && formattedValue) {
                    const cleanTag = formattedValue.replace(/[<>]/g, '');
                    document.execCommand('formatBlock', false, cleanTag);
                }
            }

            handleEditorInput();
        },
        [handleEditorInput],
    );

    const extractField = (text: string, fieldName: string) => {
        const m = text.match(new RegExp(`${fieldName}:\\s*(.+)`, 'i'));
        return m ? m[1].trim() : null;
    };

    const mapSopType = useCallback((sopType?: string) => {
        if (!sopType || typeof sopType !== 'string') return '';
        const normalized = sopType.trim().toLowerCase();
        if (normalized === 'schedule') return 'schedule_based';
        if (normalized === 'event') return 'event_based';
        return sopType;
    }, []);

    const getGeneratedSopType = useCallback(() => {
        const latest = [...messages].reverse().find((m) => m.role === 'assistant' && (m.u_sop_type || m.sop_type));
        const rawType = latest?.u_sop_type || latest?.sop_type || '';
        return mapSopType(rawType);
    }, [messages, mapSopType]);

    const approveMutation = useMutation({
        mutationFn: async (content: string) => {
            const detectedSopType =
                getGeneratedSopType() || extractField(content, 'Ticket Type') || extractField(content, 'TICKET_TYPE') || extractField(content, 'Ticket_Type') || '';

            if (sopData) {
                await fasteaiApiClient.put(`/sops/${sopData.id}`, {
                    ...sopData,
                    sop_content: content,
                    u_sop_type: detectedSopType || sopData.u_sop_type || sopData.sop_type || '',
                    is_approved: 'False',
                    created_by: currentUser,
                    author: currentUser,
                    LastObserved_On: new Date().toISOString(),
                });
            } else {
                const sopId = extractField(content, 'SOP_ID') || extractField(content, 'SOP ID') || `SOP-${Date.now()}`;
                const osType = (extractField(content, 'Operating_System') || extractField(content, 'Operating System') || '').toLowerCase();
                const category = osType.includes('windows') ? 'windows' : osType.includes('linux') ? 'linux' : 'application';

                await fasteaiApiClient.post('/sops', {
                    sop_name: `${sopId}.docx`,
                    sop_content: content,
                    category,
                    u_sop_type: detectedSopType,
                    is_approved: 'False',
                    created_by: currentUser,
                    author: currentUser,
                    Created_On: new Date().toISOString(),
                    LastObserved_On: new Date().toISOString(),
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEYS.UNIFIED_DATASET });
            if (onApproveSuccess) onApproveSuccess();
            navigate({ to: '/faste-ai/sop-dashboard/approval' });
        },
        onError: (err: unknown) => {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setToastMessage(errorMessage || 'Failed to submit SOP.');
            setToastVariant('danger');
        },
    });

    const validation = useMemo(() => {
        return validateMandatorySections(currentRawContent || getEditorText(), sopData?.sop_name);
    }, [currentRawContent, getEditorText, sopData]);

    const isSubmitReady = hasRunPreCheck && hasContent && validation.isValid && !approveMutation.isPending;

    const handleApprove = () => {
        const text = getEditorText();
        if (!text.trim()) return;
        approveMutation.mutate(text);
    };

    const handleActionResult = (msg: string) => {
        setToastMessage(msg);
        setToastVariant('success');
        setShowToast(true);
    };

    return (
        <div className="bg-white border border-[#d6ebff] rounded-2xl shadow-[inset_0px_0px_20px_0px_rgba(89,172,255,0.5019607843)] flex flex-col h-full w-full box-border overflow-hidden relative">
            {showToast && (
                <div
                    className={`absolute top-4 right-4 z-50 min-w-65 p-4 rounded-xl shadow-lg border text-white font-semibold flex items-center justify-between ${
                        toastVariant === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'
                    }`}
                >
                    <span>{toastMessage}</span>
                    <button
                        onClick={() => setShowToast(false)}
                        className="ml-4 text-white hover:text-gray-200 cursor-pointer flex items-center justify-center p-1 transition-colors border-none bg-transparent"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>
            )}

            {/* Header Bar */}
            <div className="flex items-center justify-between bg-[#bbddff] border-b border-[#a5d2ff] px-3 md:px-4 py-2 min-h-14 shrink-0 box-border gap-2 mb-4 overflow-x-auto no-scrollbar">
                <h2 className="text-xs md:text-sm font-bold text-[#011a80] leading-none m-0 shrink-0 whitespace-nowrap">Standard Operating Procedure</h2>
                <div className="flex items-center gap-1.5 md:gap-2 h-8 shrink-0">
                    <button
                        className="group flex items-center h-8 px-2.5 border border-[#3b5cd7] text-[#3b5cd7] bg-white hover:bg-blue-50 disabled:opacity-40 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer box-border shrink-0"
                        onClick={() => setViewMode(viewMode === 'full' ? 'workflow' : 'full')}
                        disabled={!hasContent}
                        title={viewMode === 'full' ? 'Workflow Diagram' : 'Back to Text'}
                    >
                        {viewMode === 'full' ? <BsDiagram3 size={15} className="shrink-0" /> : <BsFileEarmarkText size={15} className="shrink-0" />}
                        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-1.5 transition-all duration-300 ease-in-out whitespace-nowrap">
                            {viewMode === 'full' ? 'Workflow Diagram' : 'Back to Text'}
                        </span>
                    </button>

                    {hasContent && (
                        <SOPContentActions
                            content={currentRawContent || getEditorText()}
                            fileName={sopData?.sop_name || 'SOP_Document'}
                            onResult={handleActionResult}
                            className="shrink-0 flex items-center"
                        />
                    )}

                    <button
                        className="group flex items-center h-8 px-2.5 bg-[#02239f] hover:bg-[#011a80] disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer disabled:cursor-not-allowed box-border border-none shadow-xs shrink-0"
                        onClick={handlePreCheckClick}
                        disabled={!hasContent || isGenerating}
                        title="Pre-Check"
                    >
                        <FaShieldAlt size={14} className="shrink-0" />
                        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-1.5 transition-all duration-300 ease-in-out whitespace-nowrap">
                            {isPreChecking && isGenerating ? 'Evaluating...' : 'Pre-Check'}
                        </span>
                    </button>

                    <button
                        className="group flex items-center h-8 px-2.5 bg-[#4b5563] hover:bg-[#374151] disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer disabled:cursor-not-allowed box-border border-none shadow-xs shrink-0"
                        onClick={handleInjectTools}
                        disabled={!hasContent || isInjectingTools || isGenerating}
                        title="Map MCP Tools"
                    >
                        <FaWrench size={13} className="shrink-0" />
                        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-1.5 transition-all duration-300 ease-in-out whitespace-nowrap">
                            {isInjectingTools ? 'Mapping...' : 'Map MCP Tools'}
                        </span>
                    </button>

                    <button
                        className={twMerge(
                            'px-2.5 md:px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 h-8 box-border border-none shadow-xs whitespace-nowrap shrink-0',
                            isSubmitReady ? 'bg-[#16a34a] hover:bg-[#128a3e] text-white cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                        )}
                        onClick={handleApprove}
                        disabled={!isSubmitReady}
                        title={
                            !hasRunPreCheck
                                ? 'Please run Pre-Check at least once before submitting'
                                : !validation.isValid
                                  ? `Missing mandatory sections: ${validation.missingSections.join(', ')}`
                                  : undefined
                        }
                    >
                        <FaCheckCircle size={14} /> <span>{approveMutation.isPending ? 'Submitting...' : 'Submit SOP'}</span>
                    </button>
                </div>
            </div>

            {/* Rich Text Editor Toolbar */}
            {viewMode === 'full' && (
                <div className="mx-5 flex items-center gap-1.5 p-2 bg-slate-50 border border-gray-100 rounded-xl shrink-0 flex-wrap mb-4 box-border select-none">
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'bold')}
                        title="Bold (Ctrl+B)"
                    >
                        <FaBold size={11} />
                    </button>
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'italic')}
                        title="Italic (Ctrl+I)"
                    >
                        <FaItalic size={11} />
                    </button>
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'underline')}
                        title="Underline (Ctrl+U)"
                    >
                        <FaUnderline size={11} />
                    </button>

                    <div className="w-px h-4 bg-gray-200 mx-1" />

                    <button
                        type="button"
                        className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        onMouseDown={(e) => execCmd(e, 'formatBlock', 'h1')}
                        title="Heading 1"
                    >
                        H1
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        onMouseDown={(e) => execCmd(e, 'formatBlock', 'h2')}
                        title="Heading 2"
                    >
                        H2
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        onMouseDown={(e) => execCmd(e, 'formatBlock', 'h3')}
                        title="Heading 3"
                    >
                        H3
                    </button>

                    <div className="w-px h-4 bg-gray-200 mx-1" />

                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'insertOrderedList')}
                        title="Numbered List"
                    >
                        <FaListOl size={11} />
                    </button>
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'insertUnorderedList')}
                        title="Bullet List"
                    >
                        <FaListUl size={11} />
                    </button>

                    <div className="w-px h-4 bg-gray-200 mx-1" />

                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'undo')}
                        title="Undo"
                    >
                        <FaUndo size={10} />
                    </button>
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'redo')}
                        title="Redo"
                    >
                        <FaRedo size={10} />
                    </button>
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'insertHorizontalRule')}
                        title="Horizontal Rule"
                    >
                        <FaMinus size={11} />
                    </button>
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'formatBlock', 'blockquote')}
                        title="Quote"
                    >
                        <MdFormatQuote size={12} />
                    </button>
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        onMouseDown={(e) => execCmd(e, 'formatBlock', 'pre')}
                        title="Code Block"
                    >
                        <FaCode size={12} />
                    </button>
                </div>
            )}

            {/* Main Document Body Box with explicit CSS rules for headings, lists, quotes */}
            <div className="flex-1 overflow-hidden rounded-xl bg-slate-50 border border-gray-100 p-5 mx-5 mb-5 box-border flex flex-col relative">
                <div className="w-full h-full flex-1 flex flex-col overflow-y-auto" style={{ display: viewMode === 'full' ? 'flex' : 'none' }}>
                    <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleEditorInput}
                        className="w-full flex-1 outline-none text-gray-800 leading-relaxed text-xs min-h-50 pb-8 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-[#011a80] [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-2 [&_h2]:text-[#011a80] [&_h3]:text-sm [&_h3]:font-bold [&_h3]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:font-mono [&_pre]:my-2"
                        style={{ whiteSpace: 'normal' }}
                    />
                    {!hasContent && (
                        <div className="h-full flex items-center justify-center p-4 my-auto pointer-events-none">
                            <div className="text-center max-w-xs">
                                <h3 className="text-xs font-bold text-[#011a80] mb-1">Awaiting SOP Generation</h3>
                                <p className="text-[11px] text-gray-400 leading-normal">
                                    Your standard operating procedure will render here. You can then edit it, export, or submit.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full h-full flex-1 flex flex-col overflow-y-auto" style={{ display: viewMode === 'workflow' ? 'flex' : 'none' }}>
                    <SOPWorkflowDiagram workflowData={workflowData} />
                </div>
            </div>
        </div>
    );
}
