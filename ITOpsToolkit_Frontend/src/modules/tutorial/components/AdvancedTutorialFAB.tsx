import { useNavigate } from '@tanstack/react-router';
import { MdPlayArrow, MdClose } from 'react-icons/md';
import { useState } from 'react';
import { appConfig } from '@/config/app-config';

const AdvancedTutorialFAB = ({ onNavigate, showDismiss = false, autoHide = false }: { onNavigate: () => void; showDismiss?: boolean; autoHide?: boolean }) => {
    const navigate = useNavigate();
    const [isHidden, setIsHidden] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleClick = () => {
        navigate({ to: '/tutorial' });
        if (onNavigate) {
            onNavigate();
        }
    };

    const handleDismiss = () => {
        setIsHidden(true);
    };

    if (autoHide && typeof window !== 'undefined') {
        setTimeout(() => {
            setIsHidden(true);
        }, 30000);
    }

    if (isHidden) {
        return null;
    }

    if (!appConfig.isInDemoEnvironment) {
        return null;
    }

    return (
        <div className="fixed bottom-10 right-5 z-40">
            {/* Main Button */}
            <button
                onClick={handleClick}
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group split-blue-light shadow p-2 rounded-full "
                title="Watch Tutorial"
                aria-label="Watch Tutorial"
            >
                {/* Icon */}
                <MdPlayArrow className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" />

                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-3 right-0 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md">
                    Watch Tutorial
                    <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>

                {/* Ripple effect on click */}
                <span className="absolute w-14 h-14 rounded-full bg-blue-400 opacity-0 animate-ping"></span>
            </button>

            {/* Dismiss Button (Optional) */}
            {showDismiss && (
                <button
                    onClick={handleDismiss}
                    className="btn-split split-blue-light w-8.75 h-8.75 rounded-full bg-gray-500 border border-white/30 flex items-center justify-center text-white text-[15px] font-semibold cursor-pointer shadow transition-all duration-150 hover:border-white/60 hover:scale-105 select-none"
                    title="Dismiss"
                    aria-label="Dismiss Tutorial Button"
                >
                    <MdClose className="w-5 h-5" />
                </button>
            )}

            {/* Expanded Menu (Optional) */}
            {isExpanded && (
                <div className="absolute bottom-full mb-3 right-0 bg-white rounded-lg shadow-xl overflow-hidden min-w-48 border border-gray-200">
                    {/* Menu Items */}
                    <button onClick={handleClick} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-900 flex items-center gap-2 group transition-colors">
                        <MdPlayArrow className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="font-semibold text-sm">Watch Tutorial</p>
                            <p className="text-xs text-gray-600">Learn how to use videos</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdvancedTutorialFAB;
