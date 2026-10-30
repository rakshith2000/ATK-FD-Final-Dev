import type React from 'react';
import type { MimDataResponse } from '@/modules/major-incident-management/types';
import type { SnowTicket } from '@/shared/modules/servicenow/types/ticket';
import { ExternalLink, Users, Mail } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import buildTeamsMeetingLinkByThreadId from '@/shared/utils/build-teams-meeting-link-by-thread-id';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import CopyText from '@/shared/components/ui/CopyText/CopyText';

interface IncidentScheduleMeetingTabProps {
    incidentNumber: string;
    mimData: MimDataResponse;
    snowIncident: SnowTicket;
    reloadQueries: () => void;
}

const IncidentScheduleMeetingTab: React.FC<IncidentScheduleMeetingTabProps> = ({ mimData }) => {
    const threadId = mimData?.meeting_details?.threadId;
    const teamsMeetingLink = buildTeamsMeetingLinkByThreadId(threadId);
    const invitees = mimData?.invitees ?? [];

    return (
        <div className="w-full h-full min-h-0 flex flex-col gap-3 p-1.5 overflow-y-auto">
            {/* Top Card - Meeting Link & Quick Actions */}
            <div className="flex flex-col bg-white rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 p-2 gap-4">
                {teamsMeetingLink ? (
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-700">Meeting Bridge</span>
                        <Link
                            className="px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-2 btn-split split-blue shadow-xs transition-colors cursor-pointer"
                            to={teamsMeetingLink}
                            target="_blank"
                        >
                            <span className="flex flex-row justify-center items-center gap-2">
                                <ExternalLink size={14} />
                                <span>Join Teams Meeting</span>
                            </span>
                        </Link>
                    </div>
                ) : null}

                {/* Meeting Meta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-2 rounded border border-slate-200/70 bg-slate-50/50 flex items-center gap-3">
                        <Users className="size-4 text-blue-600 shrink-0" />
                        <div className="flex flex-col min-w-0 gap-1">
                            <span className="text-[0.65rem] font-semibold uppercase text-slate-400">Total Invitees</span>
                            <span className="text-xs font-bold text-slate-800">{invitees.length} People</span>
                        </div>
                    </div>

                    {teamsMeetingLink && (
                        <div className="p-2 rounded border border-slate-200/70 bg-slate-50/50 flex items-center justify-between min-w-0">
                            <CopyText text={teamsMeetingLink}>
                                {() => (
                                    <div className="flex flex-col min-w-0 pr-2 gap-1">
                                        <span className="text-[0.65rem] font-semibold uppercase text-slate-400">Meeting Link</span>
                                        <Link className="text-xs font-mono text-blue-700 truncate" to={teamsMeetingLink}>
                                            {teamsMeetingLink}
                                        </Link>
                                    </div>
                                )}
                            </CopyText>
                        </div>
                    )}
                </div>
            </div>

            {/* Invitees Section */}
            <div className="flex flex-col bg-white rounded-sm shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10 p-2 gap-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <TitleWithArraow title={`Meeting Invitees (${invitees.length})`} className="text-xs font-bold" />
                </div>

                {invitees.length === 0 ? (
                    <div className="p-2 text-center text-xs text-slate-400">No invitees found.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {invitees.map((email, idx) => {
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
                                    className="flex items-center justify-between p-1.5 rounded-sm border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                                >
                                    <CopyText text={email}>
                                        {() => (
                                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                <div className="size-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                                                    {initials || <Mail size={12} />}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-mono font-medium text-slate-800 truncate" title={email}>
                                                        {email}
                                                    </span>
                                                    <span className="text-[0.6rem] text-slate-400">Invitee</span>
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
        </div>
    );
};

export default IncidentScheduleMeetingTab;
