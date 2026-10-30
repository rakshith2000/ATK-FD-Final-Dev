import { useRef } from 'react';
import { X } from 'lucide-react';
import { ChatBot, type BaseChatMessageResponseData } from '@/shared/components/smart/ChatBot/ChatBot';
import generateScenarios from '../../../services/generate-scenarios';
import type { ConvHistoryItem } from '../../../types/train-ai';

interface ScenarioPlayerProps {
    articleNumber: string;
    initialScenario: string;
    initialConvHistory: ConvHistoryItem[];
    onExit: () => void;
}

const ScenarioPlayer: React.FC<ScenarioPlayerProps> = ({ articleNumber, initialScenario, initialConvHistory, onExit }) => {
    const apiConvHistoryRef = useRef<ConvHistoryItem[]>(initialConvHistory);

    const sendMessage = async ({ userMessage }: { userMessage: string }): Promise<BaseChatMessageResponseData> => {
        const result = await generateScenarios({
            articles_number: articleNumber,
            conv_history: apiConvHistoryRef.current,
            previous_question: [],
            prompt: userMessage,
        });
        if (!result) throw new Error('Failed to generate response.');
        apiConvHistoryRef.current = result.conv_history;
        return { response: result.response, conversation_history: [] };
    };

    return (
        <div className="flex flex-col h-full w-full px-10 py-2 bg-white overflow-hidden">
            <div className="text-center mb-2 shrink-0">
                <h1 className="text-2xl font-bold">
                    <span className="text-(--brand-header-title-color)">Train </span>
                    <span className="text-(--brand-color)">Assist</span>
                </h1>
            </div>

            <div className="relative flex-1 flex flex-col border border-blue-200 rounded-lg bg-white overflow-hidden">
                <button
                    type="button"
                    onClick={onExit}
                    aria-label="Close"
                    className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-(--brand-color) text-(--brand-text-inverse) flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                    <X size={12} />
                </button>

                <ChatBot
                    systemMessage={initialScenario}
                    quickMessages={[{ label: 'Generate New Scenario', message: 'Generate New Scenario' }]}
                    sendMessage={sendMessage}
                    placeholder="Type a message..."
                />
            </div>
        </div>
    );
};

export default ScenarioPlayer;
