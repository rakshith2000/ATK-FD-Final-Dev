import { memo, useCallback } from 'react';
import { Info } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
// import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import type { ProblemTicket } from '../../../types/problem-ai';
import type { ProblemStatusFilter } from '../../../constants/problem-status-filter-options';
import formatRecLabel from '../../../utils/format-rec-label';
import countIncidentOccurrences from '../../../utils/count-incident-occurrences';
import styles from './../ProblemTicketMetaDetailsCard/ProblemTicketMetaDetailsCard.module.scss';
import { Card, CardContent, Tooltip } from '@mui/material';
interface ProblemCardProps {
    problem: ProblemTicket;
    status: ProblemStatusFilter;
    isActive: boolean;
    onClick: (problem: ProblemTicket) => void;
}

const ProblemCard: React.FC<ProblemCardProps> = memo(({ problem, status, isActive, onClick }) => {
    const recLabel = formatRecLabel(problem?.id);
    const occurrenceCount = countIncidentOccurrences(problem?.associated_incidents);

    const headerLabel = status === 'Recommended' || status === 'Rejected' ? recLabel : problem?.problem_ticket_number || recLabel;

    const shortDescription = problem?.short_description ?? '';

    const handleClick = useCallback(() => onClick(problem), [onClick, problem]);
    const StateBadge = ({ state }: { state: string | null | undefined }) => {
        const stateKey = state?.toLowerCase().trim().replace(/\s+/g, '-');
        return <span className={twMerge(styles.statusBadge, styles[stateKey ?? ''], 'text-[0.65rem]')}>{state}</span>;
    };

    const PriorityBadge = ({ priority }: { priority: string | number | null | undefined }) => {
        return <span className={twMerge(styles.priorityBadge, styles[`p${priority}`], 'text-[0.65rem]')}>P{priority}</span>;
    };

    return (
        <div data-problem-id={problem?.id} className=" w-full" role="button">
            <Card
                onClick={handleClick}
                className={twMerge(
                    'border-b border-(--brand-border-color) transition-all duration-200 brand-box-show-inset-only-hover brand-border-left-only-hover',
                    'cursor-pointer',
                    isActive && 'brand-border-left brand-box-show-inset',
                )}
                sx={{
                    borderRadius: '0px',
                    background: 'white',
                    minHeight: 'max-content',
                    width: '100%',
                    boxShadow: 'none',
                }}
            >
                <CardContent className="flex flex-col gap-4" sx={{ padding: '10px', ':last-child': { paddingBottom: '10px' } }}>
                    {/* Row 1 - Number + Badges */}
                    <div className="flex justify-between items-center">
                        <Tooltip title={headerLabel} placement="top" arrow followCursor>
                            <p className="text-xs font-semibold">
                                <span className="cursor-pointer" aria-label={headerLabel ?? ''}>
                                    {(headerLabel.length ?? 0) > 10 ? `${headerLabel?.substring(0, 10)}...` : headerLabel}
                                </span>
                            </p>
                        </Tooltip>
                        <div className="flex gap-1.5">
                            {problem.priority && <PriorityBadge priority={problem.priority} />}
                            {problem.state && <StateBadge state={problem.state} />}
                            <span className="flex items-center gap-1 2xl:gap-1.5" title={`Number of times incident occurred: ${occurrenceCount}`}>
                                <Info className="size-3.5 2xl:size-4 text-blue-500" />
                                <span className="text-[0.7rem] text-(--brand-title-primary-color) font-semibold">{occurrenceCount}</span>
                            </span>
                        </div>
                    </div>

                    <Tooltip
                        title={shortDescription}
                        placement="top"
                        arrow
                        followCursor
                        disableHoverListener={undefined}
                        disableFocusListener={undefined}
                        disableTouchListener={undefined}
                    >
                        <p className="text-[0.75rem] mb-0 text-(--brand-title-primary-color)">
                            <span className="cursor-pointer" aria-label={shortDescription ?? ''}>
                                {(shortDescription.length ?? 0) > 100 ? `${shortDescription?.substring(0, 100)}...` : shortDescription}
                            </span>
                        </p>
                    </Tooltip>

                    {/* Row 3 - Assigned To + Assignment Group */}
                    {(problem?.assigned_to || problem?.assignment_group) && (
                        <div className="flex justify-between items-center">
                            {problem.assigned_to && <span className="text-xs font-semibold text-(--brand-title-primary-color)">{problem?.assigned_to}</span>}
                            {problem?.assignment_group && (
                                <span className="text-xs">
                                    <strong>Assign. Grp: </strong>
                                    <span className="text-(--brand-title-primary-color)">{problem?.assignment_group}</span>
                                </span>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
});

ProblemCard.displayName = 'ProblemCard';

export default ProblemCard;
