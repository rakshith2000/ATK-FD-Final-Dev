import { ErrorPlaceholder, EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import { ListSkeleton } from '@/shared/components/ui/Skeletons';
import { twMerge } from 'tailwind-merge';

interface RelatedSectionProps<T> {
    label: string;
    items: T[] | undefined;
    isLoading: boolean;
    isError: boolean;
    onRetry?: () => void;
    isRefetching?: boolean;
    renderItem: (item: T, index: number) => React.ReactNode;
    height?: string;
    noDataMessage?: string;
    error?: Error | null;
    headerClassName?: string;
    headerTextClassName?: string;
}

const RelatedSectionHeader = ({
    label,
    count,
    headerClassName,
    headerTextClassName,
}: {
    label: string;
    count?: number;
    headerClassName?: string;
    headerTextClassName?: string;
}) => (
    <div className={twMerge('flex items-center gap-2 px-3 py-2', headerClassName)}>
        <span className={twMerge('text-xs font-semibold', headerTextClassName)}>{label}</span>
        {count !== undefined && <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-(--brand-color) text-(--brand-bg-color) font-semibold">{count}</span>}
    </div>
);

const RelatedSection = <T,>({
    label,
    items,
    isLoading,
    isError,
    onRetry,
    isRefetching,
    renderItem,
    height,
    error,
    noDataMessage,
    headerClassName = 'bg-(--brand-bg-color) border-b border-(--brand-border-color)',
    headerTextClassName = 'text-(--brand-title-primary-color)',
}: RelatedSectionProps<T>) => {
    return (
        <div className={twMerge('border border-[#BBDDFF] rounded-md overflow-hidden mb-2')}>
            {/* Header */}
            <RelatedSectionHeader label={label} headerClassName={headerClassName} headerTextClassName={headerTextClassName} />

            {/* Body - fixed height, always visible */}
            <div style={{ overflowY: 'auto', height: 'auto', maxHeight: height ?? '200px' }} className="bg-white">
                {isLoading ? (
                    <ListSkeleton rows={3} className="p-2" />
                ) : isError ? (
                    <ErrorPlaceholder onRetry={onRetry} iconSize={100} isRefetching={isRefetching} error={error} className="py-4" />
                ) : !items?.length ? (
                    <EmptyPlaceholder iconSize={70} message={noDataMessage || `No ${label} found for the selected ticket !`} className="py-4" />
                ) : (
                    <div className="flex flex-col">{items.map((item, index) => renderItem(item, index))}</div>
                )}
            </div>
        </div>
    );
};

export default RelatedSection;
