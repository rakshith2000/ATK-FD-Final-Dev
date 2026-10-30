import problemPriorityMatrix from '../constants/problem-priority-matrix';

const parseLeadingDigit = (raw: string | null | undefined): number | null => {
    if (!raw) return null;
    const first = raw.trim().split(/\s|-/)[0];
    const parsed = parseInt(first, 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const calculateProblemPriority = (urgency: string | null | undefined, impact: string | null | undefined): string | null => {
    const u = parseLeadingDigit(urgency);
    const i = parseLeadingDigit(impact);
    if (u === null || i === null) return null;
    const key = `${u}-${i}` as keyof typeof problemPriorityMatrix;
    const value = problemPriorityMatrix[key];
    return value ? String(value) : null;
};

export default calculateProblemPriority;
