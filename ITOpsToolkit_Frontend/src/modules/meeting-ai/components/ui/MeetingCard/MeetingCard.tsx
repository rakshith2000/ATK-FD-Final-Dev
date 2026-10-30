import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { Trash2, Users, LoaderCircle } from 'lucide-react';
import type { Meeting } from '@/modules/meeting-ai/types/meeting-ai';
import { formatMeetingDate } from '@/modules/meeting-ai/utils/format-meeting-date';
import { parseGroups } from '@/modules/meeting-ai/utils/parse-groups';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';

export interface MeetingCardProps {
    meeting: Meeting;
    onClick?: (meeting: Meeting) => void;
    onDelete?: (meeting: Meeting) => void;
    isDeleting?: boolean;
    className?: ClassNameValue;
}

const DateField: React.FC<{ label: string; iso: string | null | undefined }> = ({ label, iso }) => (
    <p className="text-xs text-(--brand-text-color) mb-0">
        <span className="font-bold">{label}: </span>
        <span title={formatMeetingDate(iso, { withTime: true })}>{formatMeetingDate(iso)}</span>
    </p>
);

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onClick, onDelete, isDeleting, className }) => {
    const { title, subject, created_at, updated_at, started_at, ended_at, groups, participants } = meeting;

    const groupList = parseGroups(groups);

    const handleClick = () => {
        if (isDeleting) return;
        onClick?.(meeting);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDeleting) return;
        onDelete?.(meeting);
    };

    return (
        <div
            data-meeting-id={meeting.id}
            onClick={handleClick}
            className={twMerge('cursor-pointer w-full', isDeleting && 'opacity-50 pointer-events-none', className)}
            role="button"
        >
            <ShellLayout className="p-3 rounded-md gap-2 border-(--brand-border-color) shadow-sm brand-border-left-only-hover brand-box-show-inset-only-hover transition-all duration-200 brand-box-show-inset">
                <ShellLayout.Header className="flex items-start justify-between gap-2  ">
                    <span className="text-xs font-bold text-(--brand-title-primary-color) line-clamp-2">{title}</span>
                    {onDelete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            aria-label="Delete meeting"
                            className=" w-7 h-7  bg-(--brand-color)  flex items-center justify-center text-white rounded-bl-full   hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                    )}
                </ShellLayout.Header>

                <ShellLayout.Body className="flex flex-col gap-1.5 text-xs text-(--brand-text-color)">
                    <div className="flex items-start justify-between gap-2">
                        {subject && <span className="text-xs font-bold text-(--ticket-id-color) line-clamp-2 ">{subject}</span>}
                        <div className="flex items-center gap-1.5 text-(--brand-text-color)">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-(--brand-color)/10">
                                <Users size={30} className="text-(--brand-color) p-1" />
                            </span>
                            <span className="font-medium">{participants?.length ?? 0} Participants</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <DateField label="Start" iso={started_at} />
                        <DateField label="Updated" iso={updated_at} />
                        <DateField label="Created" iso={created_at} />
                        <DateField label="Ended" iso={ended_at} />
                    </div>

                    <p className="text-xs text-(--brand-text-color) mb-0 flex flex-wrap items-center gap-1">
                        <span className="font-bold">Group:</span>
                        {groupList.length > 0 ? (
                            groupList.map((g) => (
                                <span
                                    key={g}
                                    className="inline-block rounded-full  border border-(--brand-border-color) text-(--brand-gradient-mix-color-1) px-2 py-0.5 text-[0.65rem] leading-tight font-medium"
                                >
                                    {g}
                                </span>
                            ))
                        ) : (
                            <span>NA</span>
                        )}
                    </p>
                </ShellLayout.Body>
            </ShellLayout>
        </div>
    );
};

MeetingCard.displayName = 'MeetingCard';

export default MeetingCard;
