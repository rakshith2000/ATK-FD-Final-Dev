import { RouterProvider } from '@tanstack/react-router';
import AppRouter from '@/AppRouter';

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof AppRouter;
    }

    interface HistoryState {
        selectedKBCategoryInKnowledgeAIForKowledgeBrowser?: string;
    }

    interface StaticDataRouteOption {
        crumb?: { label: string; icon?: React.ReactNode };
    }
}

const TanstackRouterProvider: React.FC = () => {
    return <RouterProvider router={AppRouter} />;
};

export default TanstackRouterProvider;
