import { appEnvConfig } from '@/config/app-env-config';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import UnAuthorisedAccessError from '@/shared/utils/errors/UnAuthorisedAccessError';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';

const docsSearchSchema = z.object({
    doc: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/(app)/_app/docs')({
    validateSearch: docsSearchSchema,

    component: lazyRouteComponent(async () => {
        return import('@/modules/docs/pages/DocsPage');
    }),

    beforeLoad: () => {
        if (!appEnvConfig.enableDocsPage) {
            throw new UnAuthorisedAccessError('', '');
        }
    },

    staticData: {
        crumb: {
            label: 'Documentation',
        },
    },

    head: () => ({
        meta: [{ title: 'Documentation | Autonomous ITOps Toolkit' }, { name: 'description', content: 'ITOps Toolkit documentation and guides' }],
    }),

    pendingMs: 1000,

    pendingComponent: ComponentLoadingIndicator,
});
