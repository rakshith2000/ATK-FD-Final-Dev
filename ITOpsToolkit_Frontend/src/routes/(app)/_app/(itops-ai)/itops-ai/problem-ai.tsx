import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
// import z from 'zod';

// const routeQuerySchema = z.object({
//     number: z.string().optional(),
// });

export const Route = createFileRoute('/(app)/_app/(itops-ai)/itops-ai/problem-ai')({
    component: lazyRouteComponent(async () => {
        const ProblemAIPage = await import('@/modules/problem-ai/pages/ProblemAIPage');
        return ProblemAIPage;
    }),

    staticData: {
        crumb: {
            label: 'Problem AI',
        },
    },

    head: () => ({
        meta: [{ title: 'Problem AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered proactive problem management' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.problem_ai, location);
    },

    pendingComponent: ComponentLoadingIndicator,

    // validateSearch: routeQuerySchema,
});
