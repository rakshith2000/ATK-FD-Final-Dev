import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { FileText, ChevronLeft } from 'lucide-react';

import deploymentGuide from '../markdown/mfe-deployment-guide.md?raw';
import mfeGuide from '../markdown/mfe-guide.md?raw';
import codingStandards from '../markdown/React_Module_Based_Coding_Standards.md?raw';
import authDoc from '../markdown/auth.md?raw';
import eventBusDoc from '../markdown/event-bus.md?raw';
import reactQueryDoc from '../markdown/react-query.md?raw';
import sonarqubeDoc from '../markdown/sonarqube.md?raw';
import dynamicFormDoc from '../markdown/dynamic-form.md?raw';
import formBuilderDoc from '../markdown/form-builder.md?raw';

interface DocEntry {
    slug: string;
    title: string;
    description: string;
    content: string;
}

const docs: DocEntry[] = [
    { slug: 'mfe-deployment-guide', title: 'Micro Frontend Deployment Guide', description: 'DevOps guide for deploying host and MFE apps with Nginx', content: deploymentGuide },
    { slug: 'mfe-guide', title: 'Micro Frontend Guide', description: 'Architecture Overview, Web Components, Shadow DOM, auth, routing, and consuming the MFE', content: mfeGuide },
    { slug: 'coding-standards', title: 'Coding Standards', description: 'Module-based architecture, naming conventions, and patterns', content: codingStandards },
    { slug: 'auth', title: 'Authentication', description: 'Keycloak, Entra ID, and token-based auth setup', content: authDoc },
    { slug: 'event-bus', title: 'Event Bus', description: 'Cross-module communication via event bus', content: eventBusDoc },
    { slug: 'react-query', title: 'React Query', description: 'Server state management with TanStack React Query', content: reactQueryDoc },
    { slug: 'sonarqube', title: 'SonarQube', description: 'Code quality and static analysis configuration', content: sonarqubeDoc },
    {
        slug: 'dynamic-form',
        title: 'Dynamic Form',
        description: 'Render dynamic forms from a `FormConfig` object built in code. Full control over validation functions, async logic, and callbacks',
        content: dynamicFormDoc,
    },
    {
        slug: 'form-builder',
        title: 'Form Builder',
        description:
            'Build forms from JSON configuration stored in a database. No JavaScript functions - all logic uses declarative operators. At runtime, the config is converted to a `FormConfig` that `DynamicForm` renders.',
        content: formBuilderDoc,
    },
];

const DocsPage: React.FC = () => {
    const { doc: selectedSlug } = useSearch({ from: '/(app)/_app/docs' });
    const navigate = useNavigate({ from: '/docs' });

    const selectedDoc = selectedSlug ? docs.find((d) => d.slug === selectedSlug) : undefined;

    if (selectedDoc) {
        return (
            <ShellLayout className="rounded-md">
                <ShellLayout.Header className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-gray-200">
                    <button
                        onClick={() => navigate({ search: { doc: undefined } })}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                        <ChevronLeft size={14} />
                        Back to docs
                    </button>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs font-semibold text-gray-700">{selectedDoc.title}</span>
                </ShellLayout.Header>
                <ShellLayout.Body className="p-5">
                    <div className="max-w-full mx-auto">
                        <RenderMarkdown text={selectedDoc.content} />
                    </div>
                </ShellLayout.Body>
            </ShellLayout>
        );
    }

    return (
        <ShellLayout className="rounded-md">
            <ShellLayout.Header className="px-4 py-3 bg-slate-50 border-b border-gray-200">
                <h1 className="text-sm font-bold text-gray-800">Documentation</h1>
                <p className="text-xs text-gray-500 mt-0.5">{docs.length} guides available</p>
            </ShellLayout.Header>
            <ShellLayout.Body className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-full">
                    {docs.map((doc) => (
                        <button
                            key={doc.slug}
                            onClick={() => navigate({ search: { doc: doc.slug } })}
                            className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all text-left cursor-pointer"
                        >
                            <FileText size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <h2 className="text-xs font-semibold text-gray-800 truncate">{doc.title}</h2>
                                <p className="text-[0.7rem] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{doc.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </ShellLayout.Body>
        </ShellLayout>
    );
};

export default DocsPage;
