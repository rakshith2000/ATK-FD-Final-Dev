import { createFileRoute } from '@tanstack/react-router';
import { ATECategoryAnalysis } from '../../../../../../modules/faste-ai/faste-dashboard/pages/ATECategoryAnalysis';

export const Route = createFileRoute('/(app)/_app/(faste-ai)/faste-ai/faste-dashboard/analysis')({
    component: ATECategoryAnalysisComponent,
});

function ATECategoryAnalysisComponent() {
    return <ATECategoryAnalysis />;
}
