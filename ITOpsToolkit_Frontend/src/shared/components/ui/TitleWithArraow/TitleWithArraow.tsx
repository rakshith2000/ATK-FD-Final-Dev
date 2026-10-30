import { twMerge, type ClassNameValue } from 'tailwind-merge';

interface TitleWithArraowProps {
    title: string;
    className?: ClassNameValue;
    showArrow?: boolean;
}

const TitleWithArraow: React.FC<TitleWithArraowProps> = ({ title, className, showArrow = true }) => {
    return (
        <div className={twMerge('text-xs text-(--ticket-title-color) font-bold inline-flex flex-col p-2', className)}>
            <span>{title}</span>
            <div className="relative w-full">
                <hr className="m-0 border border-(--change-arrow-color-itsm) opacity-100" />
                {showArrow ? (
                    <div
                        className="absolute right-0 top-px w-0 h-0"
                        style={{
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '7px solid var(--change-arrow-color-itsm)',
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
};

export default TitleWithArraow;
