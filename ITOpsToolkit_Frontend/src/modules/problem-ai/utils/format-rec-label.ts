/**
 * Recommended/rejected problem tickets don't have a SNOW problem-ticket number yet.
 * Show a short `Rec<first uuid block>` label instead.
 */
const formatRecLabel = (id: string | null | undefined): string => {
    if (!id) return 'Rec';
    return `Rec${String(id)}`;
};

export default formatRecLabel;
