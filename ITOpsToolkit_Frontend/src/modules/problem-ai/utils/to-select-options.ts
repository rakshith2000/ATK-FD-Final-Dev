import type { SelectOption } from '@/shared/components/ui/InputFields';
import type { ProblemStateChoice } from '../types/problem-ai';

export const stringsToSelectOptions = (values: string[] | undefined | null): SelectOption[] => {
    if (!Array.isArray(values)) return [];
    return values.map((v) => ({ label: v, value: v }));
};

export const stateChoicesToSelectOptions = (choices: ProblemStateChoice[] | undefined | null): SelectOption[] => {
    if (!Array.isArray(choices)) return [];
    return choices.map((c) => ({ label: c.label, value: c.label }));
};
