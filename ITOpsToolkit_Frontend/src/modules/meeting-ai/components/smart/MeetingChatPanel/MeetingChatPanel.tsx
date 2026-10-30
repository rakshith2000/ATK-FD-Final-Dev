import { useMemo, useState } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import type { Meeting } from '@/modules/meeting-ai/types/meeting-ai';
import { usePostMeetingChatMessageMutation } from '@/modules/meeting-ai/hooks/usePostMeetingChatMessageMutation';
import { useResponsiveMaxChips } from '@/modules/meeting-ai/hooks/useResponsiveMaxChips';
import ChatBot from '@/shared/components/smart/ChatBot/ChatBot';
import HeroSection from '@/shared/components/ui/HeroSection/HeroSection';
import MultiSelectInput from '@/shared/components/ui/InputFields/MultiSelectInput';

export interface MeetingChatPanelProps {
    meetings: Meeting[];
    initialSelectedMeetingIds?: string[];
    className?: ClassNameValue;
}

const MeetingChatPanel: React.FC<MeetingChatPanelProps> = ({ meetings, initialSelectedMeetingIds = [], className }) => {
    const [selectedChatMeetingIds, setSelectedChatMeetingIds] = useState<string[]>(() => meetings.filter((m) => initialSelectedMeetingIds.includes(m.id)).map((m) => m.id));

    const meetingOptions = useMemo(() => meetings.map((m) => ({ value: m.id, label: m.title })), [meetings]);

    const meetingChipsMax = useResponsiveMaxChips({ mobile: 1, tablet: 2, desktop: 3 });

    const chatMutation = usePostMeetingChatMessageMutation();

    return (
        <div className={twMerge('flex problem-border-left   flex-col h-full min-h-0 bg-white', className)}>
            <div className="p-2 ">
                <MultiSelectInput
                    options={meetingOptions}
                    value={selectedChatMeetingIds}
                    onChange={setSelectedChatMeetingIds}
                    placeholder="Select meetings to chat about..."
                    maxChips={meetingChipsMax}
                    triggerClassName="rounded-full"
                />
            </div>
            <div className="flex-1 min-h-0">
                <ChatBot
                    placeholder="Type your question..."
                    skeletonOnPending={false}
                    skeletonOnInit={false}
                    emptyPlaceHolderState={
                        <HeroSection
                            title="Meeting AI"
                            subTitle="Welcome to Meeting AI"
                            description="Choose a meeting from dropdown get AI powered assistance"
                            warning="AI can make mistakes, please validate the response"
                        />
                    }
                    sendMessage={({ conversation, userMessage }) =>
                        chatMutation.mutateAsync({
                            meeting_ids: selectedChatMeetingIds.join(','),
                            question: userMessage,
                            conversation_history: conversation,
                        })
                    }
                />
            </div>
        </div>
    );
};

MeetingChatPanel.displayName = 'MeetingChatPanel';

export default MeetingChatPanel;
