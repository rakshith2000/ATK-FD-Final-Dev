import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';
import type { DropdownOption } from '@/shared/modules/dashboard/components/ui/DashboardFilterBar/DashboardFilterBar';

export function useUserAssignmentGroups(enabled: boolean = true) {
    const { getUserSnowDetails } = useAuth();

    return useQuery<DropdownOption[]>({
        queryKey: ['user-assignment-groups'],
        queryFn: async () => {
            const userSnowDetails = await getUserSnowDetails();
            const groups = await fetchSnowUserMemberOfAssignmentGroupsByUserSysId({ sys_id: userSnowDetails.sys_id });
            return groups.filter((g) => g.value && g.display_value).map((g) => ({ value: g.value, label: g.display_value }));
        },
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}
