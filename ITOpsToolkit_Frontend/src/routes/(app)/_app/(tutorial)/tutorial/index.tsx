import { createFileRoute, notFound } from '@tanstack/react-router';
import VideoPage from '@/modules/tutorial/components/VideoPage';
import { appConfig } from '@/config/app-config';

export const Route = createFileRoute('/(app)/_app/(tutorial)/tutorial/')({
    head: () => ({
        meta: [{ title: 'Transition AI | Autonomous ITOps Toolkit' }, { name: 'description', content: 'AI-powered transition management tools' }],
    }),
    component: TutorialPage,
    beforeLoad: async () => {
        if (!appConfig.isInDemoEnvironment) {
            throw notFound()
        }
    },
});

function TutorialPage() {
    return (
        <div className="px-5 h-full overflow-y-auto">
            <VideoPage />
        </div>
    );
}