import { ComponentLoadingIndicator } from '@/shared/components/ui/ComponentLoadingIndicator/ComponentLoadingIndicator';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import z from 'zod';

const routeQuerySchema = z.object({
    inc: z.string().min(3, 'Incident Number is required !'),
});
export const Route = createFileRoute('/(app)/_app/(itops-ai)/itops-ai/(major-incident-management)/major-incident-management/incident-analysis')({
    component: lazyRouteComponent(async () => {
        const IncidentAnalysisRevampPage = await import('@/modules/major-incident-management-revamp/pages/IncidentAnalysisRevampPage');
        return IncidentAnalysisRevampPage;
    }),
    staticData: { crumb: { label: 'Incident Analysis' } },
    head: () => ({
        meta: [{ title: 'MIM - Incident Analysis | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered Major Incident Management tools, Incident Analysis' }],
    }),
    pendingMs: 1000,
    pendingMinMs: 100,
    pendingComponent: ComponentLoadingIndicator,
    validateSearch: routeQuerySchema,
});
