import { Activity, useState } from 'react';
import { X } from 'lucide-react';
import type { Meeting, MeetingId, MeetingKnowledgeArticle, MeetingRetrievalType, OnboardMeetingResponse } from '@/modules/meeting-ai/types/meeting-ai';
import MeetingHistoryList from '../../components/smart/MeetingHistoryList/MeetingHistoryList';
import MeetingDetailsPanel from '../../components/smart/MeetingDetailsPanel/MeetingDetailsPanel';
import OnboardMeetingForm from '../../components/smart/OnboardMeetingForm/OnboardMeetingForm';
import MeetingAuthorizationModal from '../../components/smart/MeetingAuthorizationModal/MeetingAuthorizationModal';
import MeetingArchivedArticlesModal from '../../components/smart/MeetingArchivedArticlesModal/MeetingArchivedArticlesModal';
import GenerateKBArticleModal from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/GenerateKBArticleModal';
import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import MeetingChatPanel from '../../components/smart/MeetingChatPanel/MeetingChatPanel';
import { useMeetingsByGroupAndUserQuery } from '@/modules/meeting-ai/hooks/useMeetingsByGroupAndUserQuery';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';

type SidePanel = 'none' | 'onboard' | 'chat';

const meetingArticleToIssue = (article: MeetingKnowledgeArticle): IssueWithoutKBArticle => ({
    short_description: article.title,
    description: article.content,
    close_notes: article.content,
    comments: '',
    work_notes: '',
    assignment_group: '',
    cmdb_ci: '',
    priority: '',
    sys_id: '',
    number: '',
    'cmdb_ci.sys_id': '',
    sys_created_on: '',
    caller_id: '',
    location: '',
    state: '',
    category: '',
    sys_created_by: '',
    assigned_to: '',
    ticket_link: '',
});

const MeetingAssistLanding = () => {
    const { state } = useAuth();
    const MEETING_GROUP_PREFIX = '/Meeting_Groups/';
    const groupOptions = (state.user?.groups || []).filter((item: string) => item.startsWith(MEETING_GROUP_PREFIX)).map((item: string) => item.replace(MEETING_GROUP_PREFIX, ''));
    const groupsParam = groupOptions.join('|') ?? '';

    const [selectedMeetingId, setSelectedMeetingId] = useState<MeetingId | null>(null);
    const [sidePanel, setSidePanel] = useState<SidePanel>('none');

    const [authMeeting, setAuthMeeting] = useState<{ id: string; retrievalType: MeetingRetrievalType } | null>(null);
    const [showArchivedFor, setShowArchivedFor] = useState<string | null>(null);
    const [kbSourceIssue, setKbSourceIssue] = useState<IssueWithoutKBArticle | null>(null);

    // Cache the meetings list for the chat panel's selector.
    const meetingsQuery = useMeetingsByGroupAndUserQuery(groupsParam);
    const allMeetings: Meeting[] = meetingsQuery.data ?? [];

    const handleMeetingClick = (meeting: Meeting) => {
        setSelectedMeetingId(meeting.id);
        setSidePanel('none');
    };

    const handleBack = () => {
        setSelectedMeetingId(null);
        setSidePanel('none');
    };

    const handleOnboardSuccess = (meeting: OnboardMeetingResponse) => {
        setSidePanel('none');
        setAuthMeeting({ id: meeting.id, retrievalType: 'reload' });
    };

    const handleStartSuccess = (meetingId: MeetingId) => {
        setAuthMeeting(null);
        setSelectedMeetingId(meetingId);
    };

    const handleCreateKb = (article: MeetingKnowledgeArticle) => {
        setKbSourceIssue(meetingArticleToIssue(article));
    };

    return (
        <div className="flex h-full min-h-0 w-full gap-1 ">
            {/* Main column */}
            <div className={`flex flex-col min-h-0   ${sidePanel !== 'none' ? 'w-2/3' : 'w-full'} transition-all`}>
                <Activity name="meeting-history-list" mode={selectedMeetingId ? 'hidden' : 'visible'}>
                    <MeetingHistoryList groups={groupsParam} onMeetingClick={handleMeetingClick} onAddClick={sidePanel === 'onboard' ? undefined : () => setSidePanel('onboard')} />
                </Activity>
                {selectedMeetingId && (
                    <MeetingDetailsPanel
                        meetingId={selectedMeetingId}
                        groupOptions={groupOptions}
                        onBack={handleBack}
                        onAssistantOpen={sidePanel === 'chat' ? undefined : () => setSidePanel('chat')}
                        onCreateKb={handleCreateKb}
                        onViewArchived={() => setShowArchivedFor(selectedMeetingId)}
                        onRefresh={() => setAuthMeeting({ id: selectedMeetingId, retrievalType: 'refresh' })}
                    />
                )}
            </div>

            {/* Side panel */}
            {sidePanel !== 'none' && (
                <div
                    className={`w-1/3 flex flex-col min-h-0   ${sidePanel === 'onboard' ? ' rounded-tr rounded-br brand-border-left brand-box-show-inset' : 'border-l border-gray-200 bg-gray-50 '}`}
                >
                    <div className={`flex items-start justify-between p-2 shrink-0 ${sidePanel === 'onboard' ? '' : 'brand-border-left bg-white'}`}>
                        <div className="flex flex-col items-start">
                            <TitleWithArraow title={sidePanel === 'onboard' ? 'ONBOARD MEETING' : 'MEETING ASSISTANT'} />
                        </div>
                        <button
                            type="button"
                            onClick={() => setSidePanel('none')}
                            aria-label="Close side panel"
                            className={`p-1 rounded transition-colors cursor-pointer ${
                                sidePanel === 'onboard' ? 'text-white/85 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <X size={14} className="text-(--header-title-color)" />
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden ">
                        {sidePanel === 'onboard' && <OnboardMeetingForm groupOptions={groupOptions} onSuccess={handleOnboardSuccess} />}
                        {sidePanel === 'chat' && <MeetingChatPanel meetings={allMeetings} initialSelectedMeetingIds={selectedMeetingId ? [selectedMeetingId] : []} />}
                    </div>
                </div>
            )}

            {/* Modals */}
            {authMeeting && (
                <MeetingAuthorizationModal
                    open={!!authMeeting}
                    meetingId={authMeeting.id}
                    retrievalType={authMeeting.retrievalType}
                    onClose={() => setAuthMeeting(null)}
                    onStartSuccess={handleStartSuccess}
                />
            )}

            {showArchivedFor && <MeetingArchivedArticlesModal open={!!showArchivedFor} meetingId={showArchivedFor} onClose={() => setShowArchivedFor(null)} />}

            <GenerateKBArticleModal issue={kbSourceIssue} onClose={() => setKbSourceIssue(null)} sourceType="article" />
        </div>
    );
};

MeetingAssistLanding.displayName = 'MeetingAssistLanding';

export default MeetingAssistLanding;
