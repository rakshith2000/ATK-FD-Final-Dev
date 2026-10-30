import { FaKey } from 'react-icons/fa6';
import SSOClientInfoCard from '../../smart/SSOClientInfoCard/SSOClientInfoCard';

const SSOClientConfig = () => {
    return (
        <div className="flex h-full min-h-0 flex-col gap-4 shadow border border-(--brand-border-color) rounded-md bg-white">
            {/* Header */}
            <div className="flex items-center gap-2.5 p-2 bg-(--brand-color) border-b-2 border-(--brand-border-color) shrink-0 rounded-t-md">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-(--brand-text-inverse) text-(--brand-color)">
                    <FaKey size={14} className="text-(--brand-color)" />
                </div>
                <h1 className="text-xs font-semibold text-(--brand-text-inverse)">SSO Client Configuration</h1>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 max-h-fit overflow-hidden mx-auto w-full max-w-2xl rounded-xl border border-(--brand-border-color) bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-(--brand-border-color) bg-(--brand-color)/3 px-4 py-2.5">
                    <span className="size-1.5 rounded-full bg-(--brand-color)" />
                    <span className="text-xs font-semibold text-(--brand-title-primary-color)">SSO Client Details</span>
                </div>
                <SSOClientInfoCard />
            </div>
        </div>
    );
};

export default SSOClientConfig;
