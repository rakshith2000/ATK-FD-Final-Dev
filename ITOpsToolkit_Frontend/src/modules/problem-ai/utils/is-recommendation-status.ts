/**
 * Recommended / rejected tickets have no SNOW problem-ticket number yet; they
 * are still in proactive-approval flow and need different rendering.
 */
const isRecommendationStatus = (approvalStatus: string | null | undefined): boolean => {
    const v = approvalStatus?.toLowerCase() ?? '';
    return v.includes('recommend') || v.includes('rejected');
};

export default isRecommendationStatus;
