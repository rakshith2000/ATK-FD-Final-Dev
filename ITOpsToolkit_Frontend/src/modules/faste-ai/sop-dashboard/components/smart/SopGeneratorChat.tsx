import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    FaFileAlt,
    FaRegUser,
    FaExclamationTriangle,
    FaTimes,
    FaCloud,
    FaDesktop,
    FaLinux,
    FaNetworkWired,
    FaDatabase,
    FaCheckCircle,
    FaPlus,
    FaCircle,
    FaCog,
    FaChevronDown,
    FaChevronUp,
    FaSearch,
    FaBook,
    FaEye,
} from 'react-icons/fa';
import { FiCpu } from 'react-icons/fi';
import { BiLoaderAlt } from 'react-icons/bi';
import { HiMicrophone, HiStop } from 'react-icons/hi';
import { MdUploadFile } from 'react-icons/md';
import { FileText } from 'lucide-react';

import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { extractTextFromDocument, validateDocumentFile } from '../../utils/documentProcessor';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';
import { SvgBotIcon } from '@/shared/utils/SvgBotIcon';
import fasteaiApiClient from '@/api/axios-clients/fasteai/fasteai-api-client';
import Modal from '@/shared/components/ui/Modal/Modal';
import RichTextEditor, { RichTextEditorContent } from '@/shared/modules/rich-text-editor';
import { sopTextToHtml } from '../../utils/sopFormatting';
import SOPContentActions from '../ui/SopContentActions';

/* --- Chatbot Loader Component --- */
const ChatbotLoader = () => (
    <>
        <style>
            {`
            span[data-loader] {
              display: inline-block;
              font-size: 0.875rem;
              line-height: 1.4em;
              height: 1.4em;
              overflow: hidden;
              position: relative;
            }

            span[data-loader]:before {
              content: "Generating...\\Aज...\\Aजe...\\Aज⟒n...\\Aज⟒n⟒...\\Aज⟒ner...\\AGenera...\\AGenerat...\\AGe⋏erati..\\AGenerat⟟n.\\AGenerati⋏g";
              white-space: pre;
              display: inline-block;
              animation: scrollText 1.5s infinite steps(11) alternate;
              background: linear-gradient(90deg, #1a3d7c, #3f6fd1, #1a3d7c);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }

            @keyframes scrollText {
              100% { transform: translateY(-100%); }
            }

            @keyframes fadePulse {
              0% { opacity: 0.3; }
              50% { opacity: 1; }
              100% { opacity: 0.3; }
            }
          `}
        </style>
        <span data-loader />
    </>
);

/* --- Interfaces --- */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'error';
    content: string | Record<string, unknown> | null;
    inputType?: 'text' | 'voice' | 'document';
    timestamp?: string;
    suggestions?: string[];
    phase?: string;
    category?: string;
    is_complete?: boolean;
}

interface SopGeneratorChatProps {
    messages: ChatMessage[];
    isConnected: boolean;
    isReconnecting: boolean;
    isProcessing: boolean;
    onSendMessage: (content: string, inputType: 'text' | 'voice' | 'document') => void;
    onStartNewSession: () => void;
    initialMessage?: string;
}

interface SuggestedSopItem {
    id?: string;
    sop_name: string;
    kb_number?: string;
    category?: string;
    sop_content?: string;
}

/* --- Constants --- */
const QUICK_START_OPTIONS = [
    {
        label: 'Jenkins Job Failure',
        category: 'application',
        prompt: 'Create an SOP for investigating and resolving a Jenkins pipeline build failure using MCP tools — ticket type: Incident',
    },
    { label: 'GitLab Project Create', category: 'application', prompt: 'Create an SOP for creating a new GitLab project (repository) using MCP tools — ticket type: Request' },
    { label: 'AWS EC2 Start/Stop', category: 'cloud', prompt: 'Create an SOP for starting and stopping an AWS EC2 EBS-backed instance — ticket type: Service Request' },
    { label: 'Linux Service Down', category: 'linux', prompt: 'Create an SOP for resolving a Linux systemctl service that is stopped or unresponsive — ticket type: Incident' },
    { label: 'Windows High CPU', category: 'windows', prompt: 'Create an SOP for investigating and resolving high CPU utilization on a Windows Server — ticket type: Incident' },
    {
        label: 'GCP Firewall Remediation',
        category: 'cloud',
        prompt: 'Create an SOP for remediating GCP VPC firewall rules that allow unrestricted inbound access from 0.0.0.0/0 — ticket type: Request',
    },
];

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
    info: { label: 'Gathering Info', color: '#6366f1' },
    access: { label: 'Access & Connectivity', color: '#0891b2' },
    steps: { label: 'Building Steps', color: '#0284c7' },
    escalation: { label: 'Escalation Details', color: '#d97706' },
    complete: { label: 'SOP Complete', color: '#16a34a' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    application: <FaCog />,
    cloud: <FaCloud />,
    windows: <FaDesktop />,
    linux: <FaLinux />,
    network: <FaNetworkWired />,
    database: <FaDatabase />,
    default: <FaFileAlt />,
};

const IGNORED_SEARCH_TERMS = new Set([
    'info',
    'information',
    'information gathering',
    'info gathering',
    'gathering',
    'event',
    'event-based',
    'event based',
    'event_based',
    'schedule',
    'schedule-based',
    'schedule based',
    'schedule_based',
]);

const isIgnoredSearchQuery = (query?: string | null): boolean => {
    if (!query) return true;
    const normalized = query.trim().toLowerCase();
    if (!normalized || normalized.length < 3) return true;
    if (IGNORED_SEARCH_TERMS.has(normalized)) return true;
    if (normalized.startsWith('info') || normalized.startsWith('event') || normalized.startsWith('schedule')) return true;
    return false;
};

/* --- Shared Sub-components --- */
const Avatar = ({ role }: { role: 'user' | 'assistant' | 'error' }) => {
    if (role === 'user') {
        return (
            <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold mt-0.5 text-(--brand-color)">
                <FaRegUser size={14} />
            </div>
        );
    }

    if (role === 'error') {
        return (
            <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold mt-0.5 text-(--brand-color)">
                <FaExclamationTriangle size={14} className="text-red-500" />
            </div>
        );
    }

    return (
        <div className="shrink-0 mt-0.5">
            <SvgBotIcon size={40} />
        </div>
    );
};

const CopyIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const CopyButton = ({ text, isUserBubble }: { text: string; isUserBubble: boolean }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const blob = new Blob([text], { type: 'text/plain' });
            await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy message'}
            className={`
                opacity-0 group-hover:opacity-100 transition-opacity duration-150
                p-1 rounded cursor-pointer
                ${isUserBubble ? 'text-blue-200 hover:text-white hover:bg-blue-500' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}
                ${copied ? 'opacity-100' : ''}
            `}
        >
            {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
    );
};

const MessageRow = ({ role, content, timestamp }: { role: 'user' | 'assistant' | 'error'; content: string | Record<string, unknown> | null; timestamp?: string }) => {
    if (!content) return null;
    const isUser = role === 'user';
    const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    const formatTimestamp = (ts?: string) => {
        if (!ts) return '';
        const date = new Date(ts);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`flex gap-1.5 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <Avatar role={role} />
            <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 text-[10px] text-gray-400 ${isUser ? 'justify-end' : ''}`}>
                    <span className="font-bold">{isUser ? 'You' : role === 'assistant' ? 'Assistant' : 'Error'}</span>
                    {timestamp && <span>{formatTimestamp(timestamp)}</span>}
                </div>
                <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed max-w-full overflow-auto wrap-break-word ${
                        isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'brand-box-show-inset text-(--brand-text-color) rounded-tl-sm'
                    }`}
                >
                    {isUser ? textContent : <RenderMarkdown text={textContent} />}
                </div>
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <CopyButton text={textContent} isUserBubble={isUser} />
                </div>
            </div>
        </div>
    );
};

/* --- SOP Reference Dropdown Component --- */
const SopReferenceDropdownCard: React.FC<{
    currentTopic?: string | null;
    onSelectSop: (referenceText: string, fullSop?: SuggestedSopItem) => void;
    onToggleExpand?: (expanded: boolean) => void;
    isDisabled?: boolean;
}> = ({ currentTopic, onSelectSop, onToggleExpand, isDisabled }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SuggestedSopItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [previewSop, setPreviewSop] = useState<SuggestedSopItem | null>(null);

    const fetchSuggestions = useCallback(async (query: string) => {
        setIsLoading(true);
        try {
            const res = await fasteaiApiClient.get('/sops/mcp-search', {
                params: { query: query.trim(), k: 5 },
            });
            if (res.data?.results && Array.isArray(res.data.results)) {
                setResults(res.data.results);
            } else {
                setResults([]);
            }
        } catch {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const query = searchTerm.trim() || currentTopic?.trim() || '';
        if (isIgnoredSearchQuery(query)) {
            setResults([]);
            return;
        }
        const timer = setTimeout(() => {
            fetchSuggestions(query);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchTerm, currentTopic, fetchSuggestions]);

    const handleHeaderClick = () => {
        setIsExpanded((prev) => {
            const next = !prev;
            if (onToggleExpand) onToggleExpand(next);
            return next;
        });
    };

    return (
        <>
            <div className="mx-3 mb-2 border border-blue-200/90 bg-linear-to-r from-blue-50/80 to-slate-50/80 rounded-xl shadow-xs overflow-hidden transition-all shrink-0">
                {/* Header Bar */}
                <div className="px-3 py-2 flex items-center justify-between cursor-pointer select-none hover:bg-blue-100/50 transition-colors" onClick={handleHeaderClick}>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#011a80]">
                        <FaBook className="text-[#3b5cd7]" size={13} />
                        <span>Refer Existing SOPs</span>
                        {results.length > 0 && <span className="bg-[#3b5cd7] text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">{results.length} Suggested</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                        {isLoading && <BiLoaderAlt className="animate-spin text-blue-600" size={13} />}
                        {isExpanded ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                    </div>
                </div>

                {/* Expanded Content Dropdown */}
                {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-blue-100 flex flex-col gap-2">
                        {/* Search Input Bar */}
                        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1 focus-within:border-blue-500">
                            <FaSearch size={11} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search related SOP by keyword, error, or service..."
                                className="text-xs text-gray-700 w-full outline-none border-none bg-transparent placeholder:text-gray-400"
                            />
                            {searchTerm && (
                                <button type="button" onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-0">
                                    <FaTimes size={10} />
                                </button>
                            )}
                        </div>

                        {/* Results List */}
                        {isLoading && results.length === 0 ? (
                            <div className="text-[11px] text-gray-400 italic py-1.5 flex items-center gap-1.5 justify-center">
                                <BiLoaderAlt className="animate-spin" size={12} />
                                Searching knowledge base...
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-[11px] text-gray-400 italic py-1.5 text-center">No related SOPs found. Try another search term.</div>
                        ) : (
                            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                                {results.map((sop) => {
                                    const kbStr = sop.kb_number ? `(${sop.kb_number})` : '';
                                    const referenceText = `Refer: ${sop.sop_name} ${kbStr}`.trim();
                                    return (
                                        <div
                                            key={sop.id || sop.sop_name}
                                            className="flex items-center justify-between bg-white border border-blue-100 p-2 rounded-lg hover:border-blue-300 transition-all text-xs"
                                        >
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-gray-800 truncate max-w-45" title={sop.sop_name}>
                                                        {sop.sop_name}
                                                    </span>
                                                    {sop.kb_number && (
                                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                                                            {sop.kb_number}
                                                        </span>
                                                    )}
                                                    {sop.category && (
                                                        <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded capitalize shrink-0">{sop.category}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewSop(sop)}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                                >
                                                    <FaEye size={10} /> View
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectSop(referenceText, sop)}
                                                    disabled={isDisabled}
                                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap disabled:opacity-40"
                                                >
                                                    <FaPlus size={9} /> Refer in Chat
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SOP Content View Modal */}
            <Modal
                open={Boolean(previewSop)}
                size="3xl"
                onClose={() => setPreviewSop(null)}
                closeButtonClassName="top-3 right-3 w-8 h-8 rounded-2xl bg-gray-100/90 hover:bg-gray-200 text-gray-500 border border-gray-200/50 flex items-center justify-center transition-colors shadow-xs"
            >
                <Modal.Header className="pt-2 px-3 mb-2 pr-14 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <h2 className="text-(--brand-title-primary-color,#011a80) font-bold flex items-center gap-2 text-sm truncate">
                            <FileText className="text-(--brand-title-primary-color,#011a80) shrink-0" size={16} />
                            <span className="truncate">{previewSop?.sop_name || 'SOP Content Blueprint'}</span>
                        </h2>
                        {previewSop && (
                            <p className="text-[11px] text-gray-400 font-normal tracking-wide pl-6">
                                KB: {previewSop.kb_number || 'N/A'} • Category: {previewSop.category || 'General'}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <SOPContentActions content={previewSop?.sop_content} fileName={previewSop?.sop_name} />
                    </div>
                </Modal.Header>

                <Modal.Body className="p-1 border border-[#c3e0ff] shadow-[inset_0px_0px_18px_0px_rgba(89,172,255,0.22)] rounded-2xl bg-white max-h-[60vh] overflow-y-auto mx-4 my-2">
                    {previewSop?.sop_content ? (
                        <RichTextEditor
                            key={previewSop.id || previewSop.sop_name}
                            initialHtml={sopTextToHtml(previewSop.sop_content)}
                            isEditable={false}
                            theme="sop"
                            preserveInitialHtml={{ classes: true, styles: true, head: true }}
                            className="w-full my-0 mx-0 border-0 shadow-none bg-transparent max-w-none"
                        >
                            <RichTextEditorContent className="min-h-0 max-h-none overflow-visible bg-transparent p-0" />
                        </RichTextEditor>
                    ) : (
                        <p className="text-slate-400 text-xs italic p-3">No description content provided for this SOP.</p>
                    )}
                </Modal.Body>

                <Modal.Footer className="justify-between pt-1 pb-3 px-4 mt-1">
                    <button
                        type="button"
                        onClick={() => setPreviewSop(null)}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                        Close
                    </button>
                    {previewSop && (
                        <button
                            type="button"
                            onClick={() => {
                                const kbStr = previewSop.kb_number ? `(${previewSop.kb_number})` : '';
                                onSelectSop(`Refer: ${previewSop.sop_name} ${kbStr}`.trim(), previewSop);
                                setPreviewSop(null);
                            }}
                            className="bg-[#004fc4] text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:bg-[#003da1] transition-all flex items-center gap-1.5 cursor-pointer border-none"
                        >
                            <FaPlus size={10} /> Insert Reference into Chat
                        </button>
                    )}
                </Modal.Footer>
            </Modal>
        </>
    );
};

/* --- Main Component --- */
export default function SopGeneratorChat({ messages, isConnected, isReconnecting, isProcessing, onSendMessage, onStartNewSession, initialMessage }: SopGeneratorChatProps) {
    const [inputValue, setInputValue] = useState(initialMessage || '');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingDocument, setIsProcessingDocument] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (initialMessage) setInputValue(initialMessage);
    }, [initialMessage]);

    const {
        finalTranscript,
        interimTranscript,
        listening,
        isProcessing: voiceProcessing,
        startListening,
        stopListening,
        resetTranscript,
        browserSupportsSpeechRecognition,
    } = useVoiceRecorder();

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    };

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessing, isProcessingDocument, voiceProcessing, scrollToBottom]);

    useEffect(() => {
        if (finalTranscript) {
            setInputValue((prev) => prev + finalTranscript);
            autoResize();
        }
    }, [finalTranscript]);

    useEffect(() => {
        if (
            interimTranscript &&
            !listening &&
            (interimTranscript.includes('microphone') || interimTranscript.includes('access denied') || interimTranscript.includes('not found'))
        ) {
            setError(interimTranscript);
            resetTranscript();
        }
    }, [interimTranscript, listening, resetTranscript]);

    useEffect(() => {
        setIsRecording(listening);
        if (!listening && isRecording) setIsRecording(false);
    }, [listening, isRecording]);

    const latestSuggestions = useMemo(() => {
        const last = [...messages].reverse().find((m) => m.role === 'assistant');
        const raw = last?.suggestions || [];
        return raw.filter(
            (s) =>
                typeof s === 'string' &&
                s.trim().length > 2 &&
                s.trim().length < 100 &&
                !s.toLowerCase().includes('describe the it') &&
                !s.toLowerCase().includes('type your message') &&
                !s.toLowerCase().includes('connecting...'),
        );
    }, [messages]);

    const currentPhase = useMemo(() => {
        const last = [...messages].reverse().find((m) => m.role === 'assistant');
        return last?.phase || null;
    }, [messages]);

    const currentCategory = useMemo(() => {
        const last = [...messages].reverse().find((m) => m.role === 'assistant' && m.category);
        return last?.category || null;
    }, [messages]);

    const latestUserQuery = useMemo(() => {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user' && m.content && typeof m.content === 'string' && m.content.trim().length > 2);
        if (!lastUser || typeof lastUser.content !== 'string') return null;
        return lastUser.content.slice(0, 100).trim();
    }, [messages]);

    const isSOPComplete = useMemo(() => {
        return messages.some((m) => m.role === 'assistant' && m.is_complete === true);
    }, [messages]);

    const handleSend = useCallback(() => {
        if (inputValue.trim() && isConnected) {
            onSendMessage(inputValue.trim(), 'text');
            setInputValue('');
            setError('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
    }, [inputValue, isConnected, onSendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        if (!isConnected || isProcessing) return;
        onSendMessage(suggestion, 'text');
        setInputValue('');
        setError('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleSelectReferenceSop = useCallback(
        (refText: string, fullSop?: SuggestedSopItem) => {
            if (!isConnected || isProcessing) return;

            const sopName =
                fullSop?.sop_name ||
                refText
                    .replace(/^Refer:\s*/i, '')
                    .replace(/\(KB[0-9]+\)/i, '')
                    .trim();
            let kbNum = fullSop?.kb_number || '';
            if (!kbNum) {
                const match = refText.match(/\b(KB[0-9]{4,})\b/i);
                if (match) kbNum = match[1].toUpperCase();
            }

            const kbTag = kbNum ? ` (KB Number: ${kbNum})` : '';
            const promptToSend = `Please refer to SOP "${sopName}"${kbTag} for this step. If this step fails, try executing this SOP first before escalating.`;

            onSendMessage(promptToSend, 'text');
            setInputValue('');
            setError('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        },
        [isConnected, isProcessing, onSendMessage],
    );

    const handleQuickStart = (prompt: string) => {
        setInputValue(prompt);
        setTimeout(autoResize, 0);
    };

    const handleVoiceToggle = async () => {
        if (!browserSupportsSpeechRecognition) {
            setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
            return;
        }
        if (isRecording) {
            stopListening();
            setIsRecording(false);
        } else {
            resetTranscript();
            setError('');
            const result = await startListening();
            if (result === false) setIsRecording(false);
            else setIsRecording(true);
        }
    };

    const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setIsProcessingDocument(true);
            setError('');
            validateDocumentFile(file);
            const extractedText = await extractTextFromDocument(file);
            if (extractedText.trim()) {
                onSendMessage(`Enhancing By fasteai\n\n${extractedText}`, 'document');
            } else {
                setError('No text content found in the document');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage || 'Error parsing document file');
        } finally {
            setIsProcessingDocument(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="relative flex flex-col w-full h-full bg-white border border-[#d6ebff] rounded-2xl shadow-[inset_0px_0px_20px_0px_rgba(89,172,255,0.5)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#bbddff] border-b border-[#a5d2ff] px-5 py-3 h-16 min-h-16 max-h-16 shrink-0 box-border gap-4">
                <div className="flex flex-col justify-center">
                    <h2 className="text-[15px] font-bold text-[#011a80] leading-none m-0">SOP Generator Chat</h2>
                    <div className="flex items-center gap-2 mt-2 h-4">
                        {currentCategory && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-[#3b5cd7] px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100 leading-none">
                                {CATEGORY_ICONS[currentCategory] || CATEGORY_ICONS.default} {currentCategory}
                            </span>
                        )}
                        {currentPhase && PHASE_LABELS[currentPhase] && (
                            <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border leading-none"
                                style={{
                                    backgroundColor: PHASE_LABELS[currentPhase].color + '15',
                                    color: PHASE_LABELS[currentPhase].color,
                                    borderColor: PHASE_LABELS[currentPhase].color + '30',
                                }}
                            >
                                {PHASE_LABELS[currentPhase].label}
                            </span>
                        )}
                        <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold leading-none ${
                                isConnected ? 'text-green-600' : isReconnecting ? 'text-amber-500 animate-pulse' : 'text-gray-400'
                            }`}
                        >
                            <FaCircle size={6} fill="currentColor" /> {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting…' : 'Disconnected'}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onStartNewSession}
                    className="flex items-center gap-1 bg-[#02239f] text-white hover:bg-[#011a80] px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer h-8 border-none"
                >
                    <FaPlus size={10} /> New Session
                </button>
            </div>

            {/* Error Notification Bar */}
            {error && (
                <div className="mx-4 mt-3 flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-rose-500">
                            <FaExclamationTriangle />
                        </span>
                        <span className="font-medium">{error}</span>
                    </div>
                    <button
                        type="button"
                        className="text-rose-500 hover:text-rose-700 text-base font-bold flex items-center justify-center border-none bg-transparent cursor-pointer"
                        onClick={() => setError('')}
                    >
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center my-auto px-4 py-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl shadow-xs mb-3">
                            <FiCpu />
                        </div>
                        <h3 className="text-sm font-bold text-[#011a80] mb-1">SOP Generator Assistant</h3>
                        <p className="text-xs text-gray-400 max-w-70 leading-normal mb-4">Describe the IT operation or process you need an SOP for, or pick a quick start below.</p>
                        <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                            {QUICK_START_OPTIONS.map((opt, i) => (
                                <button
                                    type="button"
                                    key={i}
                                    className="flex items-center gap-2 border border-gray-100 bg-[#f8fafd] hover:bg-blue-50/50 hover:border-blue-200 px-3 py-2 rounded-xl text-[11px] font-medium text-left text-gray-700 transition-all cursor-pointer truncate"
                                    onClick={() => handleQuickStart(opt.prompt)}
                                    disabled={!isConnected}
                                    title={opt.prompt}
                                >
                                    <span className="flex items-center shrink-0">{CATEGORY_ICONS[opt.category] || CATEGORY_ICONS.default}</span>
                                    <span className="truncate">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message, index) => (
                            <MessageRow key={index} role={message.role} content={message.content} timestamp={message.timestamp} />
                        ))}

                        {(isProcessing || isProcessingDocument || voiceProcessing) && (
                            <div className="flex gap-1.5 flex-row items-start">
                                <Avatar role="assistant" />
                                <div className="max-w-[75%] rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm brand-box-show-inset text-gray-800 flex items-center">
                                    <ChatbotLoader />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* SOP Completion Notice */}
            {isSOPComplete && (
                <div className="mx-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs mb-2 font-medium shrink-0">
                    <span className="flex items-center text-emerald-600">
                        <FaCheckCircle />
                    </span>
                    <span>SOP is complete! Review the document on the right, then save or export it.</span>
                </div>
            )}

            {/* Quick Reply Suggestions */}
            {latestSuggestions.length > 0 && !isProcessing && messages.length > 0 && !isSOPComplete && (
                <div className="px-4 flex flex-wrap gap-2 mb-2">
                    {latestSuggestions.map((suggestion, i) => (
                        <button
                            type="button"
                            key={i}
                            onClick={() => handleSuggestionClick(suggestion)}
                            disabled={!isConnected}
                            className="text-xs px-3 py-1.5 rounded-full border border-(--brand-color) text-(--brand-color) hover:bg-(--brand-color) hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {/* Suggested Reference SOPs Dropdown Card (MCP RAG Search) */}
            {!isSOPComplete && (
                <SopReferenceDropdownCard
                    currentTopic={latestUserQuery || currentCategory || currentPhase}
                    onSelectSop={handleSelectReferenceSop}
                    onToggleExpand={scrollToBottom}
                    isDisabled={!isConnected || isProcessing}
                />
            )}

            {/* Recording Active Panel */}
            {listening && (
                <div className="mx-4 mb-2 flex flex-col gap-1 bg-blue-50 border border-blue-100 text-blue-700 p-2.5 rounded-xl text-[11px]">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="font-bold">Recording... Speak now</span>
                    </div>
                    {interimTranscript && (
                        <div className="mt-1 border-t border-blue-100/50 pt-1">
                            <span className="font-bold mr-1">Live transcription:</span>
                            <span className="italic text-gray-600">{interimTranscript}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Chat Input Container */}
            <div className="px-3 py-2.5 pb-3 border-t border-gray-100 bg-white shrink-0">
                <div
                    className={`flex items-center gap-1.5 bg-white border rounded-xl px-3 py-1.5 transition-colors shadow-xs ${
                        isConnected ? 'border-gray-300 focus-within:border-(--brand-color) focus-within:ring-1 focus-within:ring-(--brand-color)' : 'border-gray-200'
                    }`}
                >
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            autoResize();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={isConnected ? 'Describe the IT operation or process...' : isReconnecting ? 'Reconnecting…' : 'Connecting...'}
                        disabled={!isConnected || isProcessingDocument}
                        className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none leading-relaxed disabled:opacity-40"
                        style={{ maxHeight: '150px' }}
                    />

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-gray-500 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
                            onClick={handleVoiceToggle}
                            disabled={!isConnected || isProcessingDocument || !browserSupportsSpeechRecognition}
                            title={isRecording ? 'Stop recording' : 'Start voice input'}
                        >
                            {isRecording ? (
                                <HiStop className="text-rose-500 text-base" />
                            ) : voiceProcessing ? (
                                <BiLoaderAlt className="animate-spin text-base" />
                            ) : (
                                <HiMicrophone className="text-base" />
                            )}
                        </button>

                        <button
                            type="button"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-gray-500 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!isConnected || isProcessingDocument}
                            title="Upload document (PDF or Word)"
                        >
                            {isProcessingDocument ? <BiLoaderAlt className="animate-spin text-base" /> : <MdUploadFile className="text-base" />}
                        </button>
                        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" onChange={handleDocumentUpload} style={{ display: 'none' }} />

                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || !isConnected || isProcessingDocument || voiceProcessing}
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            {isProcessing ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2" className="animate-spin">
                                    <defs>
                                        <linearGradient id="sop_grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#011a80" />
                                            <stop offset="100%" stopColor="#1887f6" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="url(#sop_grad)" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                                    <defs>
                                        <linearGradient id="sop_grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#011a80" />
                                            <stop offset="100%" stopColor="#1887f6" />
                                        </linearGradient>
                                    </defs>
                                    <line x1="22" y1="2" x2="11" y2="13" stroke="url(#sop_grad)" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="url(#sop_grad)" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
