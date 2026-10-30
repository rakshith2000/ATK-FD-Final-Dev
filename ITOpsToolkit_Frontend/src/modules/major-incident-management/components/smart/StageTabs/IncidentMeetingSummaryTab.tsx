import type React from 'react';
import type { MimDataResponse } from '@/modules/major-incident-management/types';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import { Calendar, User } from 'lucide-react';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import { formatLocalDate } from '@/shared/utils/format-local-date';
import { twMerge } from 'tailwind-merge';

interface IncidentMeetingSummaryTabProps {
    incidentNumber: string;
    mimData: MimDataResponse;
    snowIncident: SnowTicket;
    reloadQueries: () => void;
}

const parseChatMessage = (msg: { role: string; content: string }) => {
    const rawContent = msg.content || '';
    const colonIndex = rawContent.indexOf(':');

    let senderName = msg.role;
    let messageBody = rawContent;

    if (colonIndex !== -1) {
        const potentialSender = rawContent.slice(0, colonIndex).trim();
        if (potentialSender && potentialSender.length < 50 && !potentialSender.includes('\n')) {
            senderName = potentialSender;
            messageBody = rawContent.slice(colonIndex + 1).trim();
        }
    }

    const isSystemOrBot = msg.role.toLowerCase() === 'system' || msg.role.toLowerCase() === 'bot' || senderName.toLowerCase().includes('bot');

    return { senderName, messageBody, isSystemOrBot };
};

const IncidentMeetingSummaryTab: React.FC<IncidentMeetingSummaryTabProps> = ({ mimData }) => {
    const participants = mimData?.participants ?? [];
    const conversationHistory = mimData?.conversation_history ?? [];
    const meetingStartFormatted = mimData?.meeting_start_datetime ? formatLocalDate(mimData.meeting_start_datetime) : '';

    return (
        <div className="w-full h-full min-h-0 flex flex-col gap-3 p-1.5 overflow-y-auto">
            {/* Top Card - Meeting Start Date Time */}
            {meetingStartFormatted && (
                <div className="flex bg-white rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 p-2 items-center gap-3">
                    <Calendar className="size-4 text-(--brand-color) shrink-0" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Meeting Start Time:</span>
                        <span className="text-xs font-semibold text-slate-800">{meetingStartFormatted}</span>
                    </div>
                </div>
            )}

            {/* Participants Section */}
            <div className="flex flex-col bg-white rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 p-1 gap-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <TitleWithArraow title={`Meeting Participants (${participants.length})`} className="text-xs font-bold" />
                </div>

                {participants.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No participants found who joined the meeting.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {participants.map((email, idx) => {
                            const name = email.split('@')[0].replace('.', ' ');
                            const initials = name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);

                            return (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                                >
                                    <CopyText text={email} textClassName="hidden">
                                        {() => (
                                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                <div className="size-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                                                    {initials || <User size={12} />}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-mono font-medium text-slate-800 truncate" title={email}>
                                                        {email}
                                                    </span>
                                                    <span className="text-[0.6rem] text-slate-400">Participant</span>
                                                </div>
                                            </div>
                                        )}
                                    </CopyText>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Conversation History Section */}
            <div className="flex flex-col bg-white rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 p-1 gap-3 flex-1 min-h-128">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <TitleWithArraow title={`Meeting Chat History`} className="text-xs font-bold" />
                </div>

                {conversationHistory.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No conversation history recorded.</div>
                ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto pr-1.5">
                        {conversationHistory.map((msg, idx) => {
                            const { senderName, messageBody, isSystemOrBot } = parseChatMessage(msg);

                            return (
                                <div
                                    key={idx}
                                    className={twMerge(
                                        'flex flex-col gap-1.5 p-3 rounded-lg border text-xs transition-all shadow-2xs',
                                        isSystemOrBot ? 'bg-indigo-50/40 border-indigo-100 text-slate-800' : 'bg-blue-50/40 border-blue-100 text-slate-800',
                                    )}
                                >
                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className={twMerge('font-bold text-[0.7rem]', isSystemOrBot ? 'text-indigo-900' : 'text-blue-900')}>{senderName}</span>
                                            {senderName.toLowerCase() !== msg.role.toLowerCase() && (
                                                <span className="text-[0.6rem] text-slate-400 font-normal capitalize">({msg.role})</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-1 text-slate-700 text-[0.7rem] leading-relaxed overflow-x-auto font-sans">{messageBody}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IncidentMeetingSummaryTab;
