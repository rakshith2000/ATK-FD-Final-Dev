import { Card, CardContent, Tooltip } from '@mui/material';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import styles from './ProblemTicketMetaDetailsCard.module.scss';
import { memo, useCallback } from 'react';
import type { SnowTicketField } from '@/shared/modules/servicenow/types/ticket';
import { Info } from 'lucide-react';

export interface ProblemTicketMetaDetailsCardProps {
    ticketId: SnowTicketField;
    ticketNumber: SnowTicketField;
    shortDescription: SnowTicketField;
    related_incidents?: SnowTicketField;
    assignedTo?: SnowTicketField;
    assignmentGroup?: SnowTicketField;
    severity?: SnowTicketField;
    openedAt?: SnowTicketField;
    state: SnowTicketField;
    priority: SnowTicketField;
    onClick?: (ticketId: string) => void;
    isSelected?: boolean;
    className?: ClassNameValue;
    config?: {
        showAssignedTo?: boolean;
        showAssignmentGroup?: boolean;
        showSeverity?: boolean;
        showPriority?: boolean;
        showState?: boolean;
        showOpenedAt?: boolean;
        disableTooltip?: boolean;
    };
}

const DEFAULT_CONFIG: ProblemTicketMetaDetailsCardProps['config'] = {
    showAssignedTo: true,
    showAssignmentGroup: true,
    showSeverity: false,
    showOpenedAt: false,
    disableTooltip: false,
    showPriority: true,
    showState: true,
};

const StateBadge = ({ state }: { state: ProblemTicketMetaDetailsCardProps['state'] }) => {
    const stateKey = state?.display_value?.toLowerCase().trim().replace(/\s+/g, '-');
    return <span className={twMerge(styles.statusBadge, styles[stateKey ?? ''], 'text-[0.65rem]')}>{state?.display_value}</span>;
};

const PriorityBadge = ({ priority }: { priority: ProblemTicketMetaDetailsCardProps['priority'] }) => {
    return <span className={twMerge(styles.priorityBadge, styles[`p${priority?.value}`], 'text-[0.65rem]')}>P{priority?.display_value}</span>;
};

const SeverityBadge = ({ severity }: { severity: ProblemTicketMetaDetailsCardProps['severity'] }) => {
    return <span className={twMerge(styles.severityBadge, 'text-[0.65rem]')}>{severity?.display_value}</span>;
};

const ProblemTicketMetaDetailsCard: React.FC<ProblemTicketMetaDetailsCardProps> = memo(
    ({
        ticketId,
        ticketNumber,
        shortDescription,
        assignedTo,
        assignmentGroup,
        severity,
        related_incidents,
        openedAt,
        state,
        priority,
        onClick,
        isSelected = false,
        className,
        config,
    }) => {
        const resolvedConfig = { ...DEFAULT_CONFIG, ...config };
        const handleOnTicketClick = useCallback(() => {
            onClick?.(ticketId?.value ?? '');
        }, [onClick, ticketId?.value]);

        return (
            <div data-ticket-id={ticketId?.value} className={twMerge('w-full ', className)}>
                <Card
                    onClick={handleOnTicketClick}
                    className={twMerge(
                        'border-b border-(--brand-border-color)  transition-all duration-200    brand-box-show-inset-only-hover brand-border-left-only-hover',
                        'cursor-pointer',
                        isSelected && 'brand-border-left brand-box-show-inset',
                    )}
                    sx={{
                        borderRadius: '0px',
                        background: 'white',
                        minHeight: 'max-content',
                        width: '100%',
                        boxShadow: 'none',
                    }}
                >
                    <CardContent className="flex flex-col gap-4 " sx={{ padding: '10px', ':last-child': { paddingBottom: '10px' } }}>
                        {/* Row 1 - Number + Badges */}
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold">{ticketNumber?.display_value}</span>
                            <div className="flex gap-1.5">
                                {resolvedConfig.showPriority && priority && <PriorityBadge priority={priority} />}
                                {resolvedConfig.showSeverity && severity && <SeverityBadge severity={severity} />}
                                {resolvedConfig.showState && state && <StateBadge state={state} />}
                                {related_incidents && (
                                    <span className="flex items-center gap-1 2xl:gap-1.5" title={`Number of times incident occurred: ${related_incidents?.display_value}`}>
                                        <Info className="size-3.5 2xl:size-4 text-blue-500" />
                                        <span className="text-[0.7rem] text-(--brand-title-primary-color) font-semibold">{related_incidents?.display_value}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Row 2 - Short Description */}
                        <Tooltip
                            title={shortDescription?.display_value}
                            placement="top"
                            arrow
                            followCursor
                            disableHoverListener={resolvedConfig.disableTooltip}
                            disableFocusListener={resolvedConfig.disableTooltip}
                            disableTouchListener={resolvedConfig.disableTooltip}
                        >
                            <p className="text-[0.75rem] mb-0 text-(--brand-title-primary-color)">
                                <span className="cursor-pointer" aria-label={shortDescription?.display_value ?? ''}>
                                    {(shortDescription?.display_value?.length ?? 0) > 100
                                        ? `${shortDescription?.display_value?.substring(0, 100)}...`
                                        : shortDescription?.display_value}
                                </span>
                            </p>
                        </Tooltip>

                        {/* Row 3 - Assigned To + Assignment Group */}
                        {(resolvedConfig.showAssignedTo || resolvedConfig.showAssignmentGroup) && (
                            <div className="flex justify-between items-center">
                                {resolvedConfig.showAssignedTo && assignedTo && (
                                    <span className="text-xs font-semibold text-(--brand-title-primary-color)">{assignedTo?.display_value}</span>
                                )}
                                {resolvedConfig.showAssignmentGroup && assignmentGroup && (
                                    <span className="text-xs">
                                        <strong>Assign. Grp: </strong>
                                        <span className="text-(--brand-title-primary-color)">{assignmentGroup?.display_value}</span>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Row 4 - Opened At */}
                        {resolvedConfig.showOpenedAt && openedAt && (
                            <div className="flex items-center gap-1">
                                <span className="text-[0.7rem] text-gray-600 font-semibold">Opened:</span>
                                <span className="text-[0.7rem] text-(--brand-title-primary-color) font-semibold">{openedAt?.display_value}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    },
    (prev, next) =>
        prev.isSelected === next.isSelected &&
        prev.ticketId === next.ticketId &&
        prev.ticketNumber === next.ticketNumber &&
        prev.shortDescription === next.shortDescription &&
        prev.assignedTo === next.assignedTo &&
        prev.assignmentGroup === next.assignmentGroup &&
        prev.severity === next.severity &&
        prev.openedAt === next.openedAt &&
        prev.state === next.state &&
        prev.priority === next.priority &&
        prev.onClick === next.onClick &&
        prev.config === next.config,
);

export { StateBadge as StatusBadge, PriorityBadge };
export default ProblemTicketMetaDetailsCard;
