import type { MimDataResponse } from '@/modules/major-incident-management/types';

export const SAMPLE_MIM_PAYLOAD: MimDataResponse = {
    id: '4ecc7778-ecc6-4ca6-9ffc-378a29951969',
    incident_number: 'INC0036153',
    meeting_details: {
        threadId: '19:meeting_MzViYTJjOGItZDAyYy00MmIyLWFjZGMtMjgzMWIyYzI0NTQw@thread.v2',
        meeting_id: 'MSoyM2FjYmZkOS05ODYwLTQ4MjEtODMzZi03ZGQ3MWYwZTc0YTIqMCoqMTk6bWVldGluZ19NelZpWVRKak9HSXRaREF5WXkwME1tSXlWV0ZqWkdNdE1qZ3pNV0l5WXpJME5UUXdAdGhyZWFkLnYy',
    },
    incident_details: {
        state: 'Resolved',
        number: 'INC0036153',
        sys_id: 'bb227ce6fb6f7290dd3ffa656eefdc07',
        cmdb_ci: 'KonaKart-App',
        category: 'Inquiry / Help',
        comments: '',
        location: '',
        priority: '1 - Critical',
        caller_id: '599350 ',
        work_notes:
            '2026-07-29 04:08:33 - K S (Work notes)\n1. Incident was received from the user reporting KonaKart application pages were not loading and transactions could not be processed.\r\n\r\n2. Initial validation was performed to confirm the issue and assess the scope of impact.\r\n\r\n3. Application and dependent services were reviewed for availability and any abnormal behavior during the reported timeframe.\r\n\r\n4. Service health and connectivity checks were performed to identify potential application or infrastructure-related issues.\r\n\r\n5. Application availability was continuously monitored and recovery actions were undertaken as required to restore normal service.\r\n\r\n6. Following recovery, application functionality was validated by accessing the affected pages and confirming successful application response.\r\n\r\n7. User confirmation was obtained that the application was accessible and transaction processing could proceed normally.\r\n\r\n8. Incident monitoring was continued for a period to ensure service stability and no further issues were observed.\n\n2026-03-13 07:45:06 - 599350  (Work notes)\nCreated from a similar incident INC0036152\n\n',
        assigned_to: 'CogIT ',
        close_notes: 'KonaKart application service was restored and normal functionality resumed. Application pages are accessible and transactions can be completed successfully.',
        description: 'Was facing issues loading the pages of application for almost 20 minutes. Was about to make transaction and no longer reachable.',
        ticket_link: 'https://cisicmpengineering1.service-now.com/now/nav/ui/classic/params/target/incident.do%3Fsys_id%3Dbb227ce6fb6f7290dd3ffa656eefdc07',
        'cmdb_ci.sys_id': 'c5f4626c3b7b0a1057a74f0864e45a9a',
        sys_created_by: '599350',
        sys_created_on: '2026-03-13 07:45:06',
        assignment_group: 'ZenossGroup',
        short_description: 'Konakart application issues',
    },
    ticket_state: 'Resolved',
    meeting_start_datetime: '2026-07-24T07:29:13.146000+00:00',
    participants: ['MIMBotlocal (via Teams)', 'MIMBotlocal (via Speech-to-Text)'],
    invitees: ['user.one@example.com', 'user.two@example.com', 'user.three@example.com', 'admin.team@example.com'],
    rca: 'Why 1: Why was the KonaKart application unavailable?\n- The KonaKart application pages were not loading and transactions could not be processed due to service degradation.\n\nWhy 2: Why were application pages failing to load?\n- Application and dependent services experienced abnormal behavior during the active timeframe.\n\nWhy 3: Why were dependent services behaving abnormally?\n- High memory consumption led to connection timeouts across dependent database pool instances.\n\nWhy 4: Why did memory consumption spike?\n- Unoptimized query execution plans generated unindexed temporary tables during peak transaction volume.\n\nWhy 5: Why were unoptimized query execution plans running?\n- Database statistics were outdated following recent application deployment.\n\nRoot Cause:\n- Outdated database statistics caused sub-optimal execution plans, resulting in memory exhaustion and transaction connection timeouts.',
    conversation_history: [
        {
            role: 'system',
            content: 'MIMBotlocal: Connected to incident bridge INC0036153.',
        },
        {
            role: 'system',
            content: 'MIMBotlocal: Initial triage initiated. Priority 1 - Critical.',
        },
        {
            role: 'user',
            content: 'K S: Users are reporting KonaKart application pages are timing out.',
        },
        {
            role: 'user',
            content: 'CogIT: Validating database pool and connection metrics.',
        },
        {
            role: 'system',
            content: 'MIMBotlocal: Service recovery actions applied.',
        },
        {
            role: 'user',
            content: 'K S: Application pages are now loading normally.',
        },
        {
            role: 'user',
            content: 'CogIT: Verified transaction completion across all nodes.',
        },
        {
            role: 'system',
            content: 'MIMBotlocal: Incident marked as resolved.',
        },
    ],
    incident_summary:
        'Incident INC0036153 was raised as Priority 1 - Critical due to KonaKart application pages failing to load. Immediate validation was conducted, service health was restored, and transaction processing was verified.',
};
