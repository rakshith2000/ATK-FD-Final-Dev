import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/_app/(adminstration)/settings/form-management/new')({
    component: lazyRouteComponent(() => import('@/modules/admin-portal/modules/form-builder/pages/FormConfigEditorPage'), 'CreateFormConfigPage'),

    staticData: {
        crumb: { label: 'New Form' },
    },

    head: () => ({
        meta: [{ title: 'New Form | Form Management | Settings | Autonomous ITOps Toolkit' }, { name: 'description', content: 'Create a new form configuration' }],
    }),

    pendingMs: 1000,
    pendingComponent: ComponentLoadingIndicator,
});
