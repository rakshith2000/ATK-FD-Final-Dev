import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import ContentLoader from 'react-content-loader';
import logger from '@/shared/utils/logger';
import { LoadingPlaceholder, ErrorPlaceholder } from '../../ui/Placeholders';
import { FaRegUser } from 'react-icons/fa';
import RenderMarkdown from '../RenderMarkdown/RenderMarkdown';
import { SvgBotIcon } from '@/shared/utils/SvgBotIcon';
import ChatbotLoader from '../../ui/Placeholders/ChatbotLoader';

export type ChatConversationRole = 'assistant' | 'user';
export interface ConversationEntry {
    role: ChatConversationRole;
    content: string;
}

export interface BaseChatMessageResponseData {
    response: string;
    conversation_history: Array<ConversationEntry>;
}

export interface QuickMessage {
    label: string;
    message: string;
}

export interface ChatBotProps<TResponse extends BaseChatMessageResponseData = BaseChatMessageResponseData> {
    quickMessages?: QuickMessage[];
    systemMessage?: string;
    isLoading?: boolean;
    isError?: boolean;
    error?: Error | null;
    loadingMessage?: string;
    errorMessage?: string;
    onRetry?: () => void;
    isRefetching?: boolean;
    sendMessage: ({ conversation, userMessage }: { conversation: ConversationEntry[]; userMessage: string }) => Promise<TResponse>;
    onResponse?: (response: TResponse) => void;
    onConversationChange?: (conversation: ConversationEntry[]) => void;
    title?: string;
    placeholder?: string;
    emptyPlaceHolderState?: React.ReactNode;
    className?: string;
    skeletonOnInit?: boolean;
    skeletonOnPending?: boolean;
    skeletonBubbles?: number;
    skeletonPendingLines?: number;
    iconClassName?: string;
    chatBubbleClassName?: string;
    chatUserBubbleClassName?: string;
}

const SKELETON_COLORS = { backgroundColor: '#e5e7eb', foregroundColor: '#f3f4f6' } as const;

// const TypingDots = () => (
//     <span className="inline-flex gap-1 items-center px-1">
//         {[0, 150, 300].map((d) => (
//             <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
//         ))}
//     </span>
// );

const BUBBLE_HEIGHTS = [300, 80, 120, 60, 80];
const BUBBLE_PATTERN: ChatConversationRole[] = ['assistant', 'user', 'assistant', 'user', 'assistant'];
const VW = 320;
const TYPING_LINE_WIDTHS = [1, 0.6, 0.5, 0.7, 0.55] as const;

const ChatInitSkeleton = ({ bubbles = 3 }: { bubbles?: number }) => (
    <div className="flex flex-col gap-3 px-4 py-4 w-full">
        {Array.from({ length: bubbles }, (_, i) => {
            const role = BUBBLE_PATTERN[i % BUBBLE_PATTERN.length];
            const isUser = role === 'user';
            const bh = BUBBLE_HEIGHTS[i % BUBBLE_HEIGHTS.length];

            return (
                <div key={i} className={`flex gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 mt-0.5" />
                    <div className={`${isUser ? 'min-w-[60%] max-w-[60%] ml-auto' : 'min-w-[80%] max-w-[75%]'} rounded-2xl px-3.5 py-3`}>
                        <ContentLoader viewBox={`0 0 ${VW} ${bh}`} style={{ width: '100%', height: 'auto', display: 'block' }} speed={1.8} {...SKELETON_COLORS}>
                            {Array.from({ length: Math.ceil(bh / 18) }, (_, li) => (
                                <rect key={li} x="0" y={li * 18} rx="4" ry="4" width={VW * TYPING_LINE_WIDTHS[li % TYPING_LINE_WIDTHS.length]} height={10} />
                            ))}
                        </ContentLoader>
                    </div>
                </div>
            );
        })}
    </div>
);

const TypingSkeleton = ({ lines = 3 }: { lines?: number }) => {
    const lineH = 10;
    const gap = 8;
    const h = lines * lineH + (lines - 1) * gap;

    return (
        <div className="flex gap-1.5 flex-row w-full">
            <Avatar role="assistant" />
            <div className="min-w-[90%] max-w-[90%] rounded-2xl rounded-tl-sm px-3.5 py-3">
                <ContentLoader viewBox={`0 0 ${VW} ${h}`} style={{ width: VW, height: 'auto', display: 'block' }} speed={1.8} {...SKELETON_COLORS}>
                    {Array.from({ length: lines }, (_, i) => (
                        <rect key={i} x="0" y={i * (lineH + gap)} rx="4" ry="4" width={VW * TYPING_LINE_WIDTHS[i % TYPING_LINE_WIDTHS.length]} height={lineH} />
                    ))}
                </ContentLoader>
            </div>
        </div>
    );
};

const Avatar = ({ role, iconClassName }: { role: ChatConversationRole; iconClassName?: string }) => {
    if (role === 'user') {
        return (
            <div className={`w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold mt-0.5 text-(--brand-color) ${iconClassName}`}>
                <FaRegUser size={14} />
            </div>
        );
    }

    return (
        <div>
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

const MessageRow = ({
    role,
    content,
    iconClassName,
    chatBubbleClassName,
    chatUserBubbleClassName,
}: {
    role: ChatConversationRole;
    content: string;
    iconClassName?: string;
    chatBubbleClassName?: string;
    chatUserBubbleClassName?: string;
}) => {
    const isUser = role === 'user';
    return (
        <div className={`flex gap-1.5 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <Avatar role={role} iconClassName={iconClassName} />
            <div className={`flex flex-col gap-1 max-w-[90%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed max-w-full overflow-auto break-all ${
                        isUser ? `${chatUserBubbleClassName} text-white rounded-tr-sm` : `${chatBubbleClassName} text-(--brand-text-color) rounded-tl-sm`
                    }`}
                >
                    {role === 'user' ? content : null}
                    {role === 'assistant' ? <RenderMarkdown text={content} /> : null}
                </div>
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <CopyButton text={content} isUserBubble={isUser} />
                </div>
            </div>
        </div>
    );
};

export const ChatBot = <TResponse extends BaseChatMessageResponseData = BaseChatMessageResponseData>({
    quickMessages,
    systemMessage,
    isLoading = false,
    isError = false,
    error,
    loadingMessage = 'Initializing assistant...',
    errorMessage,
    onRetry,
    isRefetching,
    sendMessage,
    onResponse,
    onConversationChange,
    placeholder = 'Type a message...',
    emptyPlaceHolderState,
    className = '',
    skeletonOnInit = false,
    skeletonOnPending = false,
    skeletonBubbles,
    skeletonPendingLines,
    iconClassName = 'brand-gradient-top-left-bottom-right',
    chatBubbleClassName = 'brand-box-show-inset',
    chatUserBubbleClassName = 'bg-blue-600',
}: ChatBotProps<TResponse>) => {
    const [conversation, setConversation] = useState<ConversationEntry[]>([]);
    const [lastfailedUserMessage, setLastfailedUserMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!onConversationChange) return;
        const fullConversation = systemMessage ? [{ role: 'assistant' as const, content: systemMessage }, ...conversation] : conversation;
        onConversationChange(fullConversation);
    }, [conversation, systemMessage, onConversationChange]);

    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastSystemMsgRef = useRef<HTMLDivElement>(null);
    const prevConversationLengthRef = useRef(0);

    const {
        mutate,
        isPending,
        error: sendError,
        reset: resetSendError,
    } = useMutation({
        mutationFn: ({ conversation, userMessage }: { conversation: ConversationEntry[]; userMessage: string }) => sendMessage({ conversation, userMessage }),

        onMutate: ({ userMessage }) => {
            setConversation((prev) => [...prev, { role: 'user', content: userMessage }]);
            setInput('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        },

        onSuccess: (chatMessageResponseData) => {
            if (!chatMessageResponseData?.response) return;
            setConversation((prev) => [...prev, { role: 'assistant', content: chatMessageResponseData?.response }]);
            onResponse?.(chatMessageResponseData);
        },

        onError: (_e, variables) => {
            setConversation((prev) => prev.slice(0, -1));
            setLastfailedUserMessage(variables.userMessage);
        },
    });

    useEffect(() => {
        const currentLength = conversation.length;

        if (currentLength > prevConversationLengthRef.current) {
            const lastMsg = conversation[currentLength - 1];

            if (lastMsg.role === 'assistant') {
                // scroll to start of system message so user reads from top
                lastSystemMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                // user message - scroll to bottom so input stays visible
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }

        prevConversationLengthRef.current = currentLength;
    }, [conversation]);

    // scroll to bottom when typing indicator appears
    useEffect(() => {
        if (isPending) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isPending]);

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    };

    const handleQuickMessage = useCallback(
        (message: string) => {
            if (isPending) return;
            resetSendError();
            const fullConversation = systemMessage ? [{ role: 'assistant' as const, content: systemMessage }, ...conversation] : conversation;
            mutate({ conversation: fullConversation, userMessage: message });
        },
        [isPending, conversation, mutate, resetSendError, systemMessage],
    );

    const handleSend = useCallback(() => {
        const trimmed = input.trim();
        if (!trimmed || isPending) return;
        resetSendError();
        const fullConversation = systemMessage ? [{ role: 'assistant' as const, content: systemMessage }, ...conversation] : conversation;
        mutate({ conversation: fullConversation, userMessage: trimmed });
    }, [input, isPending, conversation, mutate, resetSendError]);

    const handleRetry = () => {
        if (!lastfailedUserMessage) return;
        const conversationWithoutLast = conversation.slice(0, -1);
        resetSendError();
        logger.debug('Retrying to send message...', { lastfailedMessage: lastfailedUserMessage, conversationWithoutLast });
        const fullConversation = systemMessage ? [{ role: 'assistant' as const, content: systemMessage }, ...conversationWithoutLast] : conversationWithoutLast;
        mutate({ conversation: fullConversation, userMessage: lastfailedUserMessage });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isReady = !isLoading && !isError;

    return (
        <div className={`relative flex flex-col w-full h-full bg-white overflow-hidden ${className}`}>
            {isLoading && (skeletonOnInit ? <ChatInitSkeleton bubbles={skeletonBubbles} /> : <LoadingPlaceholder overlay message={loadingMessage} className="z-50 bg-white" />)}
            {isError && <ErrorPlaceholder overlay title={errorMessage} iconSize={200} error={error} onRetry={onRetry} isRefetching={isRefetching} className="z-50 bg-white" />}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-3">
                {isReady && !isPending && !systemMessage && conversation.length === 0 && emptyPlaceHolderState}

                {isReady && systemMessage && (
                    <MessageRow
                        role="assistant"
                        content={systemMessage}
                        iconClassName={iconClassName}
                        chatBubbleClassName={chatBubbleClassName}
                        chatUserBubbleClassName={chatBubbleClassName}
                    />
                )}

                {conversation.map((msg, i) => {
                    // attach ref to last system message in conversation
                    const isLastSystemMsg = msg.role === 'assistant' && conversation.slice(i + 1).every((m) => m.role !== 'assistant');

                    return (
                        <div key={i} ref={isLastSystemMsg ? lastSystemMsgRef : null}>
                            <MessageRow
                                role={msg.role}
                                content={msg.content}
                                iconClassName={iconClassName}
                                chatBubbleClassName={chatBubbleClassName}
                                chatUserBubbleClassName={chatUserBubbleClassName}
                            />
                        </div>
                    );
                })}

                {isPending &&
                    (skeletonOnPending ? (
                        <TypingSkeleton lines={skeletonPendingLines} />
                    ) : (
                        <div className="flex gap-2.5 flex-row items-center ">
                            <Avatar role="assistant" iconClassName={iconClassName} />
                            <ChatbotLoader />
                            {/* <div className={`max-w-[75%] rounded-2xl rounded-tl-sm px-3.5 py-3 text-sm ${chatBubbleClassName} text-gray-800`}>
                                <TypingDots />
                            </div> */}
                        </div>
                    ))}

                {sendError && (
                    <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                        </svg>
                        {sendError instanceof Error ? sendError.message : 'Failed to send.'}
                        <button onClick={handleRetry} className="ml-auto text-xs text-red-600 underline cursor-pointer hover:text-red-800">
                            Retry
                        </button>
                    </div>
                )}

                {isReady && !isPending && quickMessages && quickMessages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {quickMessages.map((qm, i) => (
                            <button
                                key={i}
                                onClick={() => handleQuickMessage(qm.message)}
                                disabled={isPending}
                                className="text-xs px-3 py-1.5 rounded-full border border-(--brand-color) text-(--brand-color) hover:bg-(--brand-color) hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {qm.label}
                            </button>
                        ))}
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-0.5 py-0.5 border border-gray-100 bg-gray-50 shrink-0">
                <div
                    className={`flex items-center gap-1 bg-white border rounded-lg p-1 transition-colors ${
                        isReady ? 'border-gray-200 focus-within:border-(--brand-border-color)' : 'border-gray-100'
                    }`}
                >
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            autoResize();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={isReady ? placeholder : 'Waiting for response...'}
                        disabled={!isReady || isPending}
                        className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 pl-2 bg-transparent outline-none leading-relaxed disabled:opacity-40"
                        style={{ maxHeight: '150px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || !isReady || isPending}
                        className="btn-split split-blue w-7 h-7 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        <span>
                            {isPending ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" className="animate-spin">
                                    <defs>
                                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fff" />
                                            <stop offset="100%" stopColor="#fff" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="url(#grad)" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                                    <defs>
                                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fff" />
                                            <stop offset="100%" stopColor="#fff" />
                                        </linearGradient>
                                    </defs>
                                    <line x1="22" y1="2" x2="11" y2="13" stroke="url(#grad)" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="url(#grad)" />
                                </svg>
                            )}
                        </span>
                    </button>
                </div>
                <p className="text-[10px] text-(--brand-text-muted-color) mt-0 text-center">AI can make mistakes, please validate the response</p>
            </div>
        </div>
    );
};

export default ChatBot;
