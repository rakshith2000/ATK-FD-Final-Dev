import React, { useEffect } from 'react';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/shared/modules/auth/services/ms-graph-service';
import logger from '@/shared/utils/logger';
import './MSAccountDetails.css';
import { fetchSnowUserMemberOfAssignmentGroupsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-user-member-of-assignment-groups-by-user-sys-id';
import { clearAllQueries } from '@/shared/utils/clear-all-queries';
import { fetchSnowAssignedTicketsByUserSysId } from '@/shared/modules/servicenow/services/fetch-snow-assigned-tickets-by-user-sys-id';
import { fetchSnowAssignmentGroups } from '@/shared/modules/servicenow/services/fetch-snow-assignment-groups';
import { fetchSnowTicketFieldChoicesByTikcetType } from '@/shared/modules/servicenow/services/fetch-snow-ticket-state-choices-by-ticket-type';
import { fetchKbCategories } from '@/shared/modules/atk-backend/services/fetch-kb-categories';

const MSAccountDetails: React.FC = () => {
    const { state, logout, getAccessToken, getUserSnowDetails } = useAuth();
    const user = state.user;

    const handleSignOut = async () => {
        await clearAllQueries();
        await logout();
    };

    const accessTokenQuery = useQuery({
        queryKey: ['authAccessToken'],
        queryFn: () => getAccessToken(['User.Read']),
        enabled: !!user,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const msGraphMeQuery = useQuery({
        queryKey: ['msGraphMe'],
        queryFn: async () => {
            const token = await getAccessToken(['User.Read']);
            return fetchMe(token);
        },
        enabled: !!user,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const kbCatergoriesQuery = useQuery({
        queryKey: ['snow-kb-catergoies'],
        queryFn: async () => {
            return fetchKbCategories();
        },
        staleTime: 5 * 60 * 1000,
    });

    const getSnowAssignmentGroupsBySysIdUserQuery = useQuery({
        queryKey: ['user-snow-assignment-groups'],
        queryFn: async () => {
            const snowDetails = await getUserSnowDetails();
            return fetchSnowUserMemberOfAssignmentGroupsByUserSysId({ sys_id: snowDetails.sys_id });
        },
        staleTime: 5 * 60 * 1000,
    });

    const userSnowAssignedToMeTicketsQuery = useQuery({
        queryKey: ['user-snow-assigned-to-user-tickets'],
        queryFn: fetchSnowAssignedTicketsByUserSysId.bind(null, {
            ticketType: 'incident',
        }),
        staleTime: 5 * 60 * 1000,
    });

    const snowAssignmentGroupsQuery = useQuery({
        queryKey: ['snow-assignment-groups'],
        queryFn: () => fetchSnowAssignmentGroups(),
        staleTime: 5 * 60 * 1000,
    });

    const snowTicketChoicesQuery = useQuery({
        queryKey: ['snow-ticket-choices'],
        queryFn: fetchSnowTicketFieldChoicesByTikcetType.bind(null, { ticketType: 'incident', field: 'state' }),
        staleTime: 5 * 60 * 1000,
    });

    const userServiceNowDetailsMutation = useMutation({
        mutationFn: getUserSnowDetails,
    });

    if (!user) {
        return (
            <div className="account-details-container">
                <p>No account information available</p>
            </div>
        );
    }

    useEffect(() => {
        userServiceNowDetailsMutation.mutate();
    }, []);

    logger.debug('Active User:', user);

    return (
        <div className="account-details-container">
            <div className="account-card">
                <div className="account-header">
                    <h2>Account Details</h2>
                    <button className="sign-out-btn" onClick={handleSignOut}>
                        Sign Out
                    </button>
                </div>

                <div className="account-info">
                    <div className="info-row">
                        <label>Name:</label>
                        <span className="info-value">{user.displayName || 'N/A'}</span>
                    </div>

                    <div className="info-row">
                        <label>Email:</label>
                        <span className="info-value">{user.email || user.username || 'N/A'}</span>
                    </div>

                    <div className="info-row">
                        <label>Tenant ID:</label>
                        <span className="info-value info-code">{user.tenantId || 'N/A'}</span>
                    </div>

                    <div className="info-row">
                        <label>Access Token:</label>
                        {accessTokenQuery.isLoading || accessTokenQuery.isRefetching ? (
                            <span className="info-value">Loading...</span>
                        ) : accessTokenQuery.isError ? (
                            <span className="info-value error">{accessTokenQuery.error?.message}</span>
                        ) : (
                            <span className="info-value">
                                <pre className="debug-code">{accessTokenQuery.data}</pre>
                            </span>
                        )}
                    </div>
                </div>

                <div className="debug-section">
                    <h3>Microsoft Graph /me Response</h3>
                    {msGraphMeQuery.isLoading || msGraphMeQuery.isRefetching ? (
                        <p>Loading...</p>
                    ) : msGraphMeQuery.isError ? (
                        <pre className="debug-code">Error: {msGraphMeQuery.error?.message}</pre>
                    ) : (
                        <pre className="debug-code">{JSON.stringify(msGraphMeQuery.data, null, 2)}</pre>
                    )}
                </div>

                <div className="debug-section">
                    <h3>User Service Now Details</h3>
                    {userServiceNowDetailsMutation.isPending ? (
                        <p>Loading...</p>
                    ) : userServiceNowDetailsMutation.isError ? (
                        <pre className="debug-code">Error: {userServiceNowDetailsMutation.error?.message}</pre>
                    ) : (
                        <pre className="debug-code">{JSON.stringify(userServiceNowDetailsMutation.data, null, 2)}</pre>
                    )}
                </div>

                <div className="debug-section">
                    <h3>KB Categories</h3>
                    {kbCatergoriesQuery.isPending ? (
                        <p>Loading...</p>
                    ) : kbCatergoriesQuery.isError ? (
                        <pre className="debug-code">Error: {kbCatergoriesQuery.error?.message}</pre>
                    ) : (
                        <pre className="debug-code">{JSON.stringify(kbCatergoriesQuery.data, null, 2)}</pre>
                    )}
                </div>

                <div className="debug-section">
                    <h3>User's Snow Assignment Groups</h3>
                    {getSnowAssignmentGroupsBySysIdUserQuery.isPending ? (
                        <p>Loading...</p>
                    ) : getSnowAssignmentGroupsBySysIdUserQuery.isError ? (
                        <pre className="debug-code">Error: {getSnowAssignmentGroupsBySysIdUserQuery.error?.message}</pre>
                    ) : (
                        <pre className="debug-code">{JSON.stringify(getSnowAssignmentGroupsBySysIdUserQuery.data, null, 2)}</pre>
                    )}
                </div>

                <div className="debug-section">
                    <h3>User's Snow Assigned to me Tickets</h3>
                    {userSnowAssignedToMeTicketsQuery.isPending ? (
                        <p>Loading...</p>
                    ) : userSnowAssignedToMeTicketsQuery.isError ? (
                        <pre className="debug-code">Error: {userSnowAssignedToMeTicketsQuery.error?.message}</pre>
                    ) : (
                        <pre className="debug-code">{JSON.stringify(userSnowAssignedToMeTicketsQuery.data, null, 2)}</pre>
                    )}
                </div>

                <div className="debug-section">
                    <h3>All Snow assignment groups</h3>
                    {snowAssignmentGroupsQuery.isPending ? (
                        <p>Loading...</p>
                    ) : snowAssignmentGroupsQuery.isError ? (
                        <pre className="debug-code">Error: {snowAssignmentGroupsQuery.error?.message}</pre>
                    ) : (
                        <pre className="debug-code">{JSON.stringify(snowAssignmentGroupsQuery.data, null, 2)}</pre>
                    )}
                </div>

                <div className="debug-section">
                    <h3>Snow Ticket choice's</h3>
                    {snowTicketChoicesQuery.isPending ? (
                        <p>Loading...</p>
                    ) : snowTicketChoicesQuery.isError ? (
                        <pre className="debug-code">Error: {snowTicketChoicesQuery.error?.message}</pre>
                    ) : (
                        <pre className="debug-code">{JSON.stringify(snowTicketChoicesQuery.data, null, 2)}</pre>
                    )}
                </div>

                <div className="debug-section">
                    <h3>Raw Account Data (Debug)</h3>
                    <pre className="debug-code">{JSON.stringify(user.raw, null, 2)}</pre>
                </div>

                <div className="debug-section">
                    <h3>Auth User Details (Debug)</h3>
                    <pre className="debug-code">{JSON.stringify(user, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
};

export default MSAccountDetails;
