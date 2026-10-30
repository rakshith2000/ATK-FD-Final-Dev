import { createFileRoute } from '@tanstack/react-router';
import SopGeneratorPage from '@/modules/faste-ai/sop-dashboard/pages/SopGeneratorPage';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/sop-dashboard/sop-generator')({
    component: SopGeneratorPage,
});
