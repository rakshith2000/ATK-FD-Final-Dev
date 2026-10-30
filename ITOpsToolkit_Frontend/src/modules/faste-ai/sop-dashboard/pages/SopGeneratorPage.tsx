import { useEffect, useRef, useMemo } from 'react';
import SopGeneratorChat from '@/modules/faste-ai/sop-dashboard/components/smart/SopGeneratorChat';
import SopDocumentPreview from '@/modules/faste-ai/sop-dashboard/components/smart/SopDocumentPreview';
import { useSopEngine } from '../../sop-dashboard/hooks/queries/useSopEngine';
import { useLocation, useNavigate } from '@tanstack/react-router';

type ChatMessagesType = React.ComponentProps<typeof SopGeneratorChat>['messages'];
type SopMessagesType = React.ComponentProps<typeof SopDocumentPreview>['messages'];
type SopDataType = React.ComponentProps<typeof SopDocumentPreview>['sopData'];

export default function SopGeneratorPage() {
    const { messages, isProcessing, sendMessage, startNewSession, isConnected, connect, disconnect, sessionId } = useSopEngine(null);

    const location = useLocation();
    const navigate = useNavigate();

    const hasSentInitialMessage = useRef(false);
    const hasClearedPreviousSession = useRef(false);
    const latestSopRef = useRef<string>('');

    const routerState = location.state as
        | {
              enhanceContent?: string;
              sopData?: SopDataType;
          }
        | undefined;

    useEffect(() => {
        if (!hasClearedPreviousSession.current) {
            hasClearedPreviousSession.current = true;
            startNewSession();
        }
    }, [startNewSession]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    const hasGreeting = useMemo(() => Array.isArray(messages) && messages.some((m) => m.role === 'assistant'), [messages]);

    useEffect(() => {
        if (isConnected && hasGreeting && routerState?.enhanceContent && !hasSentInitialMessage.current) {
            hasSentInitialMessage.current = true;

            sendMessage(routerState.enhanceContent, 'text');

            navigate({
                to: '/faste-ai/sop-dashboard/sop-generator',
                state: (prev) =>
                    ({
                        ...(prev as unknown as Record<string, unknown>),
                        enhanceContent: undefined,
                    }) as unknown as Record<string, unknown>,
                replace: true,
            });
        }
    }, [isConnected, hasGreeting, routerState, sendMessage, navigate]);

    const handleClearSessionReset = () => {
        hasSentInitialMessage.current = false;
        startNewSession();
    };

    const handleApproveSuccess = () => {
        handleClearSessionReset();
        navigate({ to: '/faste-ai/sop-dashboard/approval' });
    };

    const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

    const enrichedMessages = useMemo(() => {
        if (!Array.isArray(messages)) return [];

        return messages.map((m) => {
            const rawObj = isRecord(m.raw_data) ? m.raw_data : {};

            let workflow: unknown[] = [];
            const candidateWorkflows = [rawObj.workflow, rawObj.sop_content, rawObj.content, m.workflow, m.sop_content, m.content];
            for (const candidate of candidateWorkflows) {
                if (Array.isArray(candidate)) {
                    workflow = candidate;
                    break;
                }
                if (isRecord(candidate) && Array.isArray(candidate.workflow)) {
                    workflow = candidate.workflow;
                    break;
                }
            }

            let u_sop_type =
                (typeof rawObj.u_sop_type === 'string' ? rawObj.u_sop_type : '') ||
                (typeof rawObj.sop_type === 'string' ? rawObj.sop_type : '') ||
                m.u_sop_type ||
                m.sop_type ||
                '';
            const sop_content = m.sop_content || rawObj.sop_content || m.content;

            const parseJson = (target: unknown) => {
                if (typeof target === 'string' && target.trim().startsWith('{')) {
                    try {
                        return JSON.parse(target);
                    } catch {
                        return null;
                    }
                }
                if (typeof target === 'object' && target !== null) return target;
                return null;
            };

            const parsedContent = parseJson(m.content) || parseJson(m.sop_content);
            if (isRecord(parsedContent)) {
                if (!workflow || workflow.length === 0) {
                    if (Array.isArray(parsedContent.workflow)) workflow = parsedContent.workflow;
                    else if (isRecord(parsedContent.sop_content) && Array.isArray(parsedContent.sop_content.workflow)) workflow = parsedContent.sop_content.workflow;
                    else if (isRecord(parsedContent.content) && Array.isArray(parsedContent.content.workflow)) workflow = parsedContent.content.workflow;
                }
                if (!u_sop_type) {
                    u_sop_type =
                        (typeof parsedContent.u_sop_type === 'string' ? parsedContent.u_sop_type : '') ||
                        (typeof parsedContent.sop_type === 'string' ? parsedContent.sop_type : '');
                }
            }

            return {
                ...m,
                workflow: Array.isArray(workflow) ? workflow : [],
                u_sop_type,
                sop_type: m.sop_type || u_sop_type,
                sop_content: sop_content,
            };
        });
    }, [messages]);

    const strictlyTypedChatMessages = enrichedMessages as unknown as ChatMessagesType;
    const strictlyTypedSopMessages = enrichedMessages as unknown as SopMessagesType;

    return (
        <div className="w-full flex-1 h-full min-h-0 bg-[#f8fafd] pt-2 pb-6 px-6 flex flex-col overflow-hidden box-border antialiased select-none">
            <div className="w-full h-full max-w-[1700px] mx-auto flex flex-row items-stretch justify-center gap-6 box-border overflow-hidden relative">
                <div className="w-1/2 h-full flex flex-col justify-stretch items-stretch min-w-[320px] box-border overflow-hidden">
                    <SopGeneratorChat
                        messages={strictlyTypedChatMessages}
                        isConnected={isConnected}
                        isReconnecting={false}
                        isProcessing={isProcessing}
                        onSendMessage={(content, inputType) => sendMessage(content, inputType || 'text', latestSopRef.current)}
                        onStartNewSession={handleClearSessionReset}
                    />
                </div>

                <div className="w-1/2 h-full flex flex-col justify-stretch items-stretch min-w-[320px] box-border overflow-hidden">
                    <SopDocumentPreview
                        messages={strictlyTypedSopMessages}
                        isGenerating={isProcessing}
                        sopData={routerState?.sopData}
                        onApproveSuccess={handleApproveSuccess}
                        onPreCheck={() => sendMessage('Please pre-check the current SOP draft for completeness and automation readiness.', 'text', latestSopRef.current)}
                        onContentChange={(text) => (latestSopRef.current = text)}
                        sessionId={sessionId}
                    />
                </div>
            </div>
        </div>
    );
}
