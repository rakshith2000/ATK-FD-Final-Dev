import { appConfig } from '@/config/app-config';
import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';
import getAllowedPromptLibraryOptions from '@/modules/admin-portal/modules/prompt-library/utils/get-allowed-prompt-libraries';

const promptLibrarySearchSchema = z.object({
    lib: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/prompt-library')({
    validateSearch: promptLibrarySearchSchema,

    component: lazyRouteComponent(async () => {
        return import('@/modules/admin-portal/modules/prompt-library/components/smart/ToolkitPackageConfiguration/ToolkitPackageConfigurationRoute');
    }),

    staticData: {
        crumb: { label: 'Prompt Library' },
    },

    head: () => ({
        meta: [{ title: 'Prompt Library | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Manage prompt library configurations' }],
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,

    beforeLoad: async ({ search }) => {
        const authProviderInstance = getAuthProviderInstance();
        await authProviderInstance.initialize();

        if (!authProviderInstance.hasGroupMembership(appConfig.accessControl.features.gbac.adminPromptLibrary)) {
            throw new UnAuthorisedAccessError('', '');
        }

        const { lib } = search as { lib?: string };
        if (lib) {
            const allowedValues = new Set(getAllowedPromptLibraryOptions().map((opt) => opt.value));
            if (!allowedValues.has(lib)) {
                throw new UnAuthorisedAccessError('', `You are not authorised to access the "${lib}" prompt library !`);
            }
        }
    },
});
