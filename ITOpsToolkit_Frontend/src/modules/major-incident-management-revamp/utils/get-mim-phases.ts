/**
 * Groups the existing 7-step MIM workflow into the 4 process phases used by the
 * revamped "process pipeline" UI (mirrors the phase language of the shared HTML mockup).
 *
 * The step ids match the ids produced by
 * `@/modules/major-incident-management/utils/get-inc-steps` (1..7). This file only
 * describes the grouping — it does NOT change the workflow or the current-step logic.
 */
export interface MimPhase {
    key: string;
    /** Two-digit phase index shown in the phase band, e.g. "01". */
    index: string;
    name: string;
    /** Step ids (1-based) that belong to this phase, in order. */
    stepIds: number[];
}

export const MIM_PHASES: MimPhase[] = [
    { key: 'detect', index: '01', name: 'Detect & Validate', stepIds: [1] },
    { key: 'mobilise', index: '02', name: 'Mobilise & Communicate', stepIds: [2, 3] },
    { key: 'diagnose', index: '03', name: 'Diagnose & Resolve', stepIds: [4, 5, 6] },
    { key: 'record', index: '04', name: 'Record & Close', stepIds: [7] },
];
