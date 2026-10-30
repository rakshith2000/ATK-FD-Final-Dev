import { useRouterState } from '@tanstack/react-router';
import KnowledgeBrowser from '../components/smart/KnowledgeBrowser/KnowledgeBrowser';
import TransitionAITabs from '../components/ui/TransitionAITabs/TransitionAITabs';

const KnowledgeBrowserPage: React.FC = () => {
    // A category can be handed over when navigating in from Knowledge AI.
    const initialCategory = useRouterState({
        select: (s) => s.location.state?.selectedKBCategoryInKnowledgeAIForKowledgeBrowser as string | undefined,
    });

    return (
        <div id="knowledge-browser" className="flex h-full w-full flex-col overflow-hidden">
            {/* Section tabs - Train Assist / Knowledge Browser */}
            <header className="flex-none px-3 pt-3">
                <TransitionAITabs />
            </header>

            {/* Browser body */}
            <div className="min-h-0 flex-1">
                <KnowledgeBrowser initialCategory={initialCategory} />
            </div>
        </div>
    );
};

export default KnowledgeBrowserPage;
