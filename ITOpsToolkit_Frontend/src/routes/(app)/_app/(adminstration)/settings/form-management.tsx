import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/form-management')({
    component: () => <Outlet />,

    staticData: {
        crumb: { label: 'Form Management' },
    },

    head: () => ({
        meta: [{ title: 'Form Management | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Manage form configurations' }],
    }),

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminFormManagement)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
