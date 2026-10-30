import { useNavigate, useRouterState } from '@tanstack/react-router';
import { twMerge } from 'tailwind-merge';

const TABS = [
    { label: 'Train Assist', to: '/transition-ai/train-ai' },
    { label: 'Knowledge Browser', to: '/transition-ai/knowledge-browser' },
] as const;

const TransitionAITabs: React.FC = () => {
    const navigate = useNavigate();
    const pathname = useRouterState({ select: (s) => s.location.pathname });

    return (
        <nav className="flex items-center gap-3">
            {TABS.map((tab) => {
                const isActive = pathname.startsWith(tab.to);
                return (
                    <button
                        key={tab.to}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => !isActive && navigate({ to: tab.to })}
                        className={twMerge(
                            'rounded-xl px-6 py-2.5 text-sm font-bold transition-all duration-200 cursor-pointer',
                            'text-(--brand-title-primary-color)',
                            isActive ? 'bg-white shadow-md' : 'bg-white/40 hover:bg-white/70',
                        )}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
};

export default TransitionAITabs;
