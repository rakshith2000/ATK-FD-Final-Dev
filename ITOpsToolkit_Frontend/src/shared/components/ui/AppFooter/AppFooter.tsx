import { appConfig } from '@/config/app-config';

const AppFooter: React.FC = () => {
    return (
        <footer className="sticky bottom-0 z-10 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center h-7.5 px-2">
                <div className="flex-1" />
                <p className="flex-1 text-center text-[10px] font-medium text-(--brand-title-primary-color) whitespace-nowrap">
                    &copy; {appConfig.cosmotics?.brandName}. All rights reserved.
                </p>
                <div className="flex-1" />
            </div>
        </footer>
    );
};

export default AppFooter;
