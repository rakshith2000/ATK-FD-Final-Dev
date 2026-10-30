import { moduleIdMappings } from '@/license/constants/module-id-mappings';
import { requireLicensedModule } from '@/license/utils/requireLicensedModule';
import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(transition-ai)/transition-ai/knowledge-browser')({
    component: lazyRouteComponent(async () => {
        const KnowledgeBrowserPage = await import('@/modules/knowledge-browser/pages/KnowledgeBrowserPage');
        return KnowledgeBrowserPage;
    }),

    staticData: {
        crumb: {
            label: 'Knowledge Browser',
        },
    },

    head: () => ({
        meta: [{ title: 'Knowledge Browser | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Browse and explore knowledge base articles' }],
    }),

    pendingMs: 1000,

    pendingMinMs: 1000,

    beforeLoad: async ({ location }) => {
        await requireLicensedModule(moduleIdMappings.knowledge_browser, location);
    },

    pendingComponent: ComponentLoadingIndicator,
});
