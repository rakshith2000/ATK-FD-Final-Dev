import { getApiErrorMessage } from '@/api/utils/api-axios-error-response-message';
import getErrorTitle from '@/api/utils/get-error-title';
import Modal from '@/shared/components/ui/Modal/Modal';
import { ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import { useKnowledgeArticleAIScoreQuery } from '@/shared/modules/atk-backend/hooks/useKnowledgeArticleAIScoreQuery';
import type { KBArticleScoringRequest } from '@/shared/modules/atk-backend/types/knowledge-base';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

const formatLabel = (key: string) => {
    return key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

interface KBArticleAIScoreProps extends KBArticleScoringRequest {
    className?: ClassNameValue;
    score?: number;
}

const KBArticleAIScore: React.FC<KBArticleAIScoreProps> = ({ score, KBNumber, KBContent, getScoreBy, className }) => {
    const [showModal, setShowModal] = useState<boolean>(false);

    const hasScoreProp = score !== undefined;

    const aiScore = useKnowledgeArticleAIScoreQuery(
        { KBNumber, getScoreBy, KBContent },
        hasScoreProp ? showModal : true,
        hasScoreProp ? { average_score: score, score_details: {} } : undefined,
    );

    const { average_score = 0, score_details = {} } = aiScore?.data ? aiScore.data : { average_score: 0, score_details: {} };

    // A score of 0 is a valid score, so gate on the value being a number - never on truthiness.
    const hasScoreData = typeof aiScore?.data?.average_score === 'number';

    const color = ({ avgScore, isError = aiScore.isError, isLoading = aiScore.isLoading }: { avgScore?: number; isError?: boolean; isLoading?: boolean }) => {
        if (isLoading) {
            return 'text-cyan-700 bg-cyan-50 border border-cyan-200';
        }

        if (isError) {
            return 'text-rose-700 bg-rose-50 border border-rose-200';
        }

        if (typeof avgScore === 'number')
            return avgScore >= 4
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                : avgScore >= 3
                  ? 'text-amber-700 bg-amber-50 border border-amber-200'
                  : 'text-rose-700 bg-rose-50 border border-rose-200';

        return 'text-rose-700 bg-rose-50 border border-rose-200';
    };

    return (
        <>
            <div
                className={twMerge(
                    'flex flex-row gap-2 px-1.5 py-1.5 justify-center items-center text-xs min-w-max max-w-min font-semibold rounded cursor-pointer',
                    color({ avgScore: average_score }),
                    className,
                )}
                role="button"
                onClick={() => setShowModal(true)}
            >
                <Sparkles className="h-3 w-3" />

                {aiScore?.isLoading ? (
                    <div className="flex flex-row justify-center items-center gap-2">
                        <span className="leading-1">Loading AI Score</span>
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                    </div>
                ) : null}

                {aiScore?.isError ? (
                    <div className="flex flex-row justify-center items-center gap-2">
                        <span className="leading-1">Error Loading AI Score</span>
                        <RefetchButton isRefetching={aiScore.isRefetching} onRefetch={aiScore.refetch} />
                    </div>
                ) : null}

                {hasScoreData && !aiScore?.isError && !aiScore?.isLoading ? (
                    <div className="flex flex-row justify-center items-center gap-2">
                        <span className="leading-1">AI Score : {average_score?.toFixed?.(2)}</span>
                        <RefetchButton isRefetching={aiScore.isRefetching} onRefetch={aiScore.refetch} />
                    </div>
                ) : null}
            </div>

            <Modal open={showModal} className="p-0" closeOnEscapeKeyDown closeOnOutsideClick size="6xl" onClose={() => setShowModal(false)}>
                <Modal.Header className="p-2 mb-0 bg-(--brand-color) border-b-(--brand-color) text-(--brand-text-inverse) font-semibold text-sm 2xl:text-base">
                    AI Score Details
                </Modal.Header>
                <Modal.Body className="px-2 py-2 m-0 relative">
                    {aiScore?.isLoading ? <LoadingPlaceholder /> : null}
                    {aiScore?.isError ? (
                        <ErrorPlaceholder
                            iconSize={150}
                            error={aiScore?.error}
                            isRefetching={aiScore?.isRefetching}
                            onRetry={aiScore?.refetch}
                            title={
                                getApiErrorMessage(aiScore?.error)?.includes('AI Score not found for KB Number')
                                    ? (getApiErrorMessage(aiScore?.error) ?? '')
                                    : (getErrorTitle(aiScore?.error) ?? '')
                            }
                        />
                    ) : null}
                    {hasScoreData && aiScore?.data?.score_details && !aiScore?.isError && !aiScore?.isLoading ? (
                        <>
                            {/* Avg Score */}
                            <div
                                className={twMerge(
                                    'sticky top-2 flex justify-start items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-full font-extrabold border border-slate-200 self-start sm:self-auto',
                                    color({ avgScore: average_score }),
                                )}
                            >
                                <Sparkles className="h-3 w-3" />
                                <span className="">Average Score</span>
                                <span className="">-</span>
                                <span className="vertical">{average_score?.toFixed?.(2)}</span>
                            </div>

                            {/* Details */}
                            <div className="divide-y divide-slate-100 p-2">
                                {Object.entries(score_details).map(([key, detail]) => {
                                    return (
                                        <div key={key} className="py-5 flex flex-col justify-between gap-2">
                                            {/* Detail */}
                                            <div className="flex-1 space-y-1">
                                                <div className="font-semibold text-md">
                                                    {/* Title / Key */}
                                                    <h3 className="text-(--brand-title-primary-color)">{formatLabel(key)}</h3>
                                                </div>
                                                {/* Justification */}
                                                <p className="text-xs text-slate-600 leading-relaxed">{detail.justification}</p>
                                            </div>

                                            {/* Socre */}

                                            <div
                                                className={twMerge(
                                                    'flex items-center px-3 py-1 rounded-2xl self-start gap-1 text-xs font-semibold',
                                                    color({ avgScore: detail.score }),
                                                )}
                                            >
                                                <span>Score</span>
                                                <span>-</span>
                                                <span> {detail.score?.toFixed?.(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : null}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default KBArticleAIScore;
