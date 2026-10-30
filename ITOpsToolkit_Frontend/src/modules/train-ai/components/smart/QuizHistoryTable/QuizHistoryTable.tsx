import type { UseQueryResult } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { VirtualTable, type VirtualTableColumnDef } from '@/shared/modules/virtual-table';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import type { QuizListUserStatistics, TrainAiQuiz } from '../../../types/train-ai';
import RefetchButton from '@/shared/components/ui/RefetchButton/RefetchButton';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { useGetMcqsMutation } from '../../../hooks/useGetMcqsMutation';

interface QuizHistoryTableProps {
    query: UseQueryResult<QuizListUserStatistics, Error>;
}

const QuizActionCell: React.FC<{ quizCode: string; label: 'Start' | 'Resume' }> = ({ quizCode, label }) => {
    const { state: authState } = useAuth();
    const getMcqsMutation = useGetMcqsMutation();
    const navigate = useNavigate();

    const handleAction = () => {
        const type_of_submit = label === 'Start' ? 'start' : 'resume';
        getMcqsMutation.mutate(
            { user_id: authState.user?.uniqueId ?? '', quiz_code: quizCode, type_of_submit },
            {
                onSuccess: (data) => {
                    if (data) {
                        navigate({
                            to: '/transition-ai/train-ai/new-quiz',
                            search: { resume: undefined },
                            state: (prev) => ({ ...prev, quizSession: { quizId: quizCode, category: '', data } }),
                        });
                    }
                },
            },
        );
    };

    return (
        <button
            onClick={handleAction}
            disabled={getMcqsMutation.isPending}
            className="inline-flex items-center justify-center rounded px-3 py-0.5 text-xs font-semibold text-(--brand-text-inverse) bg-(--brand-color) hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
            {getMcqsMutation.isPending ? 'Loading...' : label}
        </button>
    );
};

const columns: VirtualTableColumnDef<TrainAiQuiz>[] = [
    {
        id: 'quiz_code',
        accessorKey: 'quiz_code',
        header: 'Quiz Number',
        size: 100,
        minSize: 130,
        meta: { filterType: 'text', filterPlaceholder: 'Search number...' },
    },
    {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        size: 140,
        maxSize: 180,
        meta: {
            filterType: 'select',
            filterOptions: (args) => {
                const data = args.data as TrainAiQuiz[];
                const options = new Set<string>();
                data?.forEach((q) => {
                    if (q.category) options.add(q.category);
                });
                return Array.from(options).map((opt) => ({ label: opt, value: opt }));
            },
        },
    },
    {
        id: 'sub_category',
        accessorKey: 'sub_category',
        header: 'Sub-Category',
        size: 140,
        maxSize: 180,
        meta: {
            filterType: 'select',
            filterMultiSelect: true,
            filterOptions: (args) => {
                const data = args.data as TrainAiQuiz[];
                const options = new Set<string>();
                data?.forEach((q) => {
                    if (q.sub_category) options.add(q.sub_category);
                });
                return Array.from(options).map((opt) => ({ label: opt, value: opt }));
            },
        },
    },
    {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        minSize: 300,
        meta: { filterType: 'text', filterPlaceholder: 'Search description...' },
    },
    {
        id: 'remarks',
        accessorKey: 'remarks',
        header: 'Remarks',
        size: 120,
        maxSize: 160,
        meta: {
            filterType: 'select',
            filterMultiSelect: true,
            filterOptions: (args) => {
                const data = args.data as TrainAiQuiz[];
                const options = new Set<string>();
                data?.forEach((q) => {
                    if (q.remarks) options.add(q.remarks);
                });
                return Array.from(options).map((opt) => ({ label: opt, value: opt }));
            },
        },
    },
    {
        id: 'score',
        accessorKey: 'score',
        header: 'Score',
        size: 110,
        maxSize: 130,
        enableGlobalFilter: false,
        cell: ({ getValue, row }) => {
            const score = getValue<number>();
            const status = row.original.status?.toLowerCase();
            if (status === 'not started') {
                return <QuizActionCell quizCode={row.original.quiz_code} label="Start" />;
            }
            if (status !== 'completed') {
                return <QuizActionCell quizCode={row.original.quiz_code} label="Resume" />;
            }
            if (score === -1) {
                return <span className="font-semibold text-xs text-gray-500">-</span>;
            }

            const roundedScore = Math.round(score);
            const color = roundedScore >= 80 ? '#16a34a' : roundedScore >= 60 ? '#d97706' : '#dc2626';
            return (
                <span className="font-semibold text-xs" style={{ color }}>
                    {roundedScore}%
                </span>
            );
        },
    },
];

const QuizHistoryTable: React.FC<QuizHistoryTableProps> = ({ query }) => {
    const { data, isLoading, isError, error, isRefetching, refetch } = query;

    return (
        <VirtualTable
            data={data?.quizList ?? []}
            columns={columns}
            getRowId={(row) => row.quiz_code}
            enableSorting
            initialSorting={[{ id: 'quiz_code', desc: true }]}
            enableColumnFilters
            isLoading={isLoading}
            error={isError ? error : null}
            onRetry={refetch}
            isRetrying={isRefetching}
            retryLabel="Reload"
            emptyTitle="No quiz history found"
            emptyMessage="Complete a quiz to see your history here."
            initialFiltersVisible={true}
            classNames={{
                tbodyCell: 'text-[0.65rem] 2xl:text-xs py-1',
                theadCell: 'text-xs 2xl:text-sm font-semibold py-1 bg-(--brand-color) text-(--brand-text-inverse)',
                toolbar: 'pb-2 pt-1 px-1.5',
                theadRow: 'bg-(--brand-color)',
                thead: 'bg-(--brand-color)',
                sortIcon: 'text-(--brand-text-inverse) text-xs',
            }}
        >
            <VirtualTable.Toolbar>
                <TitleWithArraow className="text-xs uppercase text-(--brand-header-title-color) font-bold p-0 m-0" title="Quiz History" />
                <div className="flex-1" />
                <VirtualTable.GlobalSearch />
                <VirtualTable.FilterConfig />
                <RefetchButton isRefetching={isRefetching} onRefetch={refetch} iconSize={18} className="text-(--brand-color)" />
            </VirtualTable.Toolbar>
            <VirtualTable.Content className="rounded-sm" />
        </VirtualTable>
    );
};

export default QuizHistoryTable;
