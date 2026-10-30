import { useState } from 'react';
import { Search } from 'lucide-react';
import TitleWithArraow from '@/shared/components/ui/TitleWithArraow/TitleWithArraow';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import TextInput from '@/shared/components/ui/InputFields/TextInput';
import MockQuizSelector from '../components/smart/MockQuizSelector/MockQuizSelector';
import ScenarioPlayer from '../components/ui/ScenarioPlayer/ScenarioPlayer';
import { useGenerateScenariosMutation } from '../hooks/useGenerateScenariosMutation';
import type { GenerateScenariosResponse } from '../types/train-ai';

type PageMode = 'selector' | 'scenario';

interface ScenarioSession {
    articleNumber: string;
    data: GenerateScenariosResponse;
}

const MockQuizPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [pageMode, setPageMode] = useState<PageMode>('selector');
    const [scenarioSession, setScenarioSession] = useState<ScenarioSession | null>(null);

    const generateScenariosMutation = useGenerateScenariosMutation();

    const handleStartScenario = (articleNumber: string) => {
        generateScenariosMutation.mutate(
            { articles_number: articleNumber, conv_history: [], previous_question: [] },
            {
                onSuccess: (data) => {
                    if (data) {
                        setScenarioSession({ articleNumber, data });
                        setPageMode('scenario');
                    } else {
                        setPageMode('selector');
                    }
                },
                onError: () => setPageMode('selector'),
            },
        );
    };

    const handleExitScenario = () => {
        setScenarioSession(null);
        setPageMode('selector');
    };

    if (pageMode === 'scenario' && scenarioSession) {
        return (
            <ScenarioPlayer
                articleNumber={scenarioSession.articleNumber}
                initialScenario={scenarioSession.data.response}
                initialConvHistory={scenarioSession.data.conv_history}
                onExit={handleExitScenario}
            />
        );
    }

    return (
        <div id="mock-quiz" className="grid w-full h-full gap-1 p-0 overflow-auto lg:overflow-hidden" style={{ gridTemplateRows: 'auto 1fr' }}>
            <div className="flex items-center justify-between mt-0.5 px-2">
                <div>
                    <TitleWithArraow title="Practice Scenarios" className="text-sm font-extrabold uppercase text-(--brand-header-title-color)" />
                    <p className="text-xs text-(--brand-header-title-color) opacity-60 px-2">Create customized quiz &amp; get evaluated – Choose your path</p>
                </div>
                <div className="relative w-64 mr-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={14} />
                    <TextInput placeholder="Search Articles..." value={searchTerm} onChange={setSearchTerm} className="pl-8 pr-3 py-1.5 bg-gray-50" />
                </div>
            </div>

            <ShellLayout className="mx-1 mb-1 shadow-xs rounded border border-gray-200 gap-0">
                <ShellLayout.Body className="overflow-hidden p-0">
                    <MockQuizSelector searchTerm={searchTerm} onStartScenario={handleStartScenario} isPending={generateScenariosMutation.isPending} />
                </ShellLayout.Body>
            </ShellLayout>
        </div>
    );
};

export default MockQuizPage;
