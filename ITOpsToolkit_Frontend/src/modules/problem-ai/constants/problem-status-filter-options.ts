export type ProblemStatusFilter = 'Recommended' | 'Approved' | 'Rejected';

const problemStatusFilterOptions: Array<{ label: string; value: ProblemStatusFilter }> = [
    { label: 'Recommended', value: 'Recommended' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
];

export default problemStatusFilterOptions;
