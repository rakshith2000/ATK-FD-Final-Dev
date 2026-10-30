import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { Clock } from 'lucide-react';
import type { TranscriptChunk } from '@/modules/meeting-ai/types/meeting-ai';
import { formatMeetingDate } from '@/modules/meeting-ai/utils/format-meeting-date';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';

export interface MeetingTranscriptViewProps {
    transcripts?: TranscriptChunk[];
    className?: ClassNameValue;
}

const MeetingTranscriptView: React.FC<MeetingTranscriptViewProps> = ({ transcripts, className }) => {
    if (!transcripts?.length) return <EmptyPlaceholder message="No transcript available" />;

    return (
        <div className={twMerge('flex flex-col gap-3 text-xs', className)}>
            {transcripts.map((chunk, idx) => {
                const timestamp = Object.keys(chunk)[0];
                const body = chunk[timestamp] ?? '';
                const lines = body
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean);

                return (
                    <div key={`${timestamp}-${idx}`} className="rounded-md border border-(--brand-border-color) bg-white p-3 brand-box-show-inset">
                        <div className="flex text-xs items-center gap-1.5 mb-2 text-(--ticket-id-color) font-semibold">
                            <Clock className="text-(--brand-title-primary-color)" size={12} />
                            <span className="text-(--brand-title-primary-color) ">{formatMeetingDate(timestamp, { withTime: true, fallback: timestamp })}</span>
                        </div>
                        <div className="flex flex-col gap-1 text-(--brand-header-title-color)">
                            {lines.map((line, i) => {
                                const colonIdx = line.indexOf(':');
                                if (colonIdx < 0) {
                                    return <div key={i}>{line}</div>;
                                }
                                const speaker = line.substring(0, colonIdx).trim();
                                const message = line.substring(colonIdx + 1).trim();
                                return (
                                    <div className="pb-1" key={i}>
                                        <strong className="text-(--brand-title-primary-color)">{speaker}:</strong> {message}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

MeetingTranscriptView.displayName = 'MeetingTranscriptView';

export default MeetingTranscriptView;
