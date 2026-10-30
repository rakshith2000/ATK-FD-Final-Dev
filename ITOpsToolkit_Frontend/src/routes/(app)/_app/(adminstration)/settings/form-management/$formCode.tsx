import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/form-management/$formCode')({
    component: lazyRouteComponent(() => import('@/modules/admin-portal/modules/form-builder/pages/FormConfigEditorPage'), 'EditFormConfigPage'),

    params: {
        parse: (params) => ({
            formCode: z.string().min(1).parse(params.formCode),
        }),
        stringify: (params) => ({
            formCode: params.formCode,
        }),
    },

    staticData: {
        crumb: { label: 'Edit Form' },
    },

    head: () => ({
        meta: [{ title: 'Edit Form | Form Management | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Edit form configuration' }],
    }),

    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async () => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminFormManagement)) {
            throw new UnAuthorisedAccessError('', '');
        }
    },
});
