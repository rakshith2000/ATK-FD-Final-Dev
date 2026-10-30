import { useState, useImperativeHandle, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useGetToolkitPackageConfigQuery } from '../../../hooks/useGetToolkitPackageConfigQuery';
import PromptLibraryList from '../../ui/PromptLibraryList/PromptLibraryList';
import PromptConfigurationsTable from '../PromptConfigurationsTable/PromptConfigurationsTable';
import TrainAiModuleConfiguration from '../TrainAiModuleConfiguration/TrainAiModuleConfiguration';
import { TableSkeleton } from '@/shared/components/ui/Skeletons';
import { ErrorPlaceholder } from '@/shared/components/ui/Placeholders';
import { TRAIN_ASSIST_MODULE } from '../../../contants/quiz-questions-options';

export interface ToolkitPackageConfigRef {
    setSelectedPackage: (pkg: string | null) => void;
}

interface ToolkitPackageConfigurationProps {
    ref?: React.Ref<ToolkitPackageConfigRef>;
    onPackageSelected?: (pkg: string) => void;
    initialPackage?: string | null;
    onPackageChange?: (pkg: string | null) => void;
}

const ToolkitPackageConfiguration: React.FC<ToolkitPackageConfigurationProps> = ({ ref, onPackageSelected, initialPackage, onPackageChange }) => {
    const [selectedPackage, setSelectedPackage] = useState<string | null>(initialPackage ?? null);

    // Sync when initialPackage changes (e.g. from query param)
    useEffect(() => {
        if (initialPackage === undefined) return;
        setSelectedPackage(initialPackage ?? null);
    }, [initialPackage]);

    useImperativeHandle(ref, () => ({ setSelectedPackage }), []);

    const getToolkitPackageConfigQuery = useGetToolkitPackageConfigQuery({
        payload: { package_name: selectedPackage ?? '' },
        enabled: !!selectedPackage,
    });

    const handleSetSelectedPackage = (pkg: string | null) => {
        setSelectedPackage(pkg);
        if (pkg) onPackageSelected?.(pkg);
        onPackageChange?.(pkg);
    };

    const backToList = (
        <button
            type="button"
            onClick={() => handleSetSelectedPackage(null)}
            className="max-w-max btn-split split-blue-light flex items-center justify-start gap-1 text-xs px-2 pr-4 py-1.5 rounded-md transition-colors cursor-pointer m-1 font-bold"
        >
            <span className="flex flex-row justify-center items-center">
                <ChevronLeft size={16} />
                <span>Back to Packages List</span>
            </span>
        </button>
    );

    if (selectedPackage === null) {
        return <PromptLibraryList setSelectedPackage={handleSetSelectedPackage} />;
    }

    if (getToolkitPackageConfigQuery.isLoading) {
        return (
            <div className="max-h-full min-h-0 shadow p-1">
                {backToList}
                <TableSkeleton COL_GAP={3} GAP={4} VW={800} cols={5} rows={15} HEADER_H={20} ROW_H={30} />
            </div>
        );
    }

    if (getToolkitPackageConfigQuery.isError) {
        return (
            <div className="max-h-full min-h-0 shadow p-1">
                {backToList}
                <ErrorPlaceholder
                    error={getToolkitPackageConfigQuery.error}
                    isRefetching={getToolkitPackageConfigQuery.isRefetching}
                    onRetry={getToolkitPackageConfigQuery.refetch}
                />
            </div>
        );
    }

    return (
        <div className="flex max-h-full min-h-0 flex-col">
            {backToList}
            <PromptConfigurationsTable
                key={selectedPackage}
                packageName={selectedPackage}
                packageConfiguration={getToolkitPackageConfigQuery.data?.package_configs}
                prompts={getToolkitPackageConfigQuery.data?.prompts ?? {}}
                error={getToolkitPackageConfigQuery.error}
                isLoading={getToolkitPackageConfigQuery.isLoading}
                isRefetching={getToolkitPackageConfigQuery.isRefetching}
                onRefetch={getToolkitPackageConfigQuery.refetch}
            />
            {selectedPackage === TRAIN_ASSIST_MODULE && <TrainAiModuleConfiguration className="mx-1 mb-2" />}
        </div>
    );
};

export default ToolkitPackageConfiguration;
