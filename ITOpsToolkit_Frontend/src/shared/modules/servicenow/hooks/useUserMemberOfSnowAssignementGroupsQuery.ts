import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId, type SnowGroup } from '../services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';

export function useUserMemberOfSnowAssignementGrpupsQuery() {
    const { getUserSnowDetails } = useAuth();
    const queryKey = ['useUserPartOfSnowAssignementGrpupsQuery'];
    const query = useQuery<Array<SnowGroup>, Error, Array<{ label: string; value: string }>>({
        queryKey: queryKey,
        queryFn: async () => {
            const userSnowDetails = await getUserSnowDetails();

            return fetchSnowUserMemberOfAssignmentGroupsByUserSysId({ sys_id: userSnowDetails.sys_id });
        },
        staleTime: 5 * 60 * 1000,
        select: (data) => data.map((c) => ({ label: c.display_value, value: c.value })),
    });

    return { ...query, queryKey };
}
