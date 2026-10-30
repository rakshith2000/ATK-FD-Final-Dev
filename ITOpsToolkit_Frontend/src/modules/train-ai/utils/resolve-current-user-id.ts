import type { AuthUser } from '@/shared/modules/auth/types/auth';
import type { QuizRecord } from '../types/train-ai';

/**
 * QuizRecord.user_id is an opaque identifier whose format depends on the SSO
 * provider / ServiceNow. We don't know up front which of the signed-in user's
 * identifiers the backend stored, so we build a candidate set and return the
 * first candidate that actually appears in the quiz data. That value is then
 * used to split "My Stats" from community stats.
 *
 * Falls back to the most stable identifier (username/email/id) when the user
 * has no records yet, which correctly yields empty "My Stats".
 */
export function resolveCurrentUserId(user: AuthUser | null, records: QuizRecord[]): string {
    if (!user) return '';

    const candidates = [user.userSnowDetails?.sys_id, user.userSnowDetails?.user_name, user.userSnowDetails?.email, user.username, user.email, user.uniqueId, user.id]
        .map((value) => value?.trim())
        .filter((value): value is string => !!value);

    if (candidates.length === 0) return '';

    const recordUserIds = new Set(records.map((record) => record.user_id));
    const matched = candidates.find((candidate) => recordUserIds.has(candidate));

    return matched ?? candidates[0];
}
