import { twMerge, type ClassNameValue } from 'tailwind-merge';
import type { FC, ReactNode, WheelEventHandler } from 'react';

interface SlotProps {
    children?: ReactNode;
    className?: ClassNameValue;
    id?: string;
}

interface ShellLayoutProps {
    children?: ReactNode;
    className?: ClassNameValue;
    id?: string;
}

interface BodySlotProps extends SlotProps {
    onWheel?: WheelEventHandler<HTMLElement>;
}

interface ShellLayoutComposition {
    Header: FC<SlotProps>;
    Body: FC<BodySlotProps>;
    Footer: FC<SlotProps>;
}

const Header: FC<SlotProps> = ({ children, className, id }) => {
    return (
        <header id={id} className={twMerge('flex-none z-10', className)}>
            {children}
        </header>
    );
};
Header.displayName = 'ShellLayout.Header';

const Body: FC<BodySlotProps> = ({ children, className, onWheel, id }) => {
    return (
        <main id={id} className={twMerge('flex-1 overflow-y-auto scroll-smooth', className)} onWheel={onWheel}>
            {children}
        </main>
    );
};
Body.displayName = 'ShellLayout.Body';

const Footer: FC<SlotProps> = ({ children, className, id }) => {
    return (
        <footer id={id} className={twMerge('flex-none z-10', className)}>
            {children}
        </footer>
    );
};
Footer.displayName = 'ShellLayout.Footer';

const ShellLayout: FC<ShellLayoutProps> & ShellLayoutComposition = ({ children, className, id }) => (
    <div id={id} className={twMerge('flex flex-col h-full min-h-0 overflow-hidden shadow-sm border border-gray-300', className)}>
        {children}
    </div>
);

ShellLayout.Header = Header;
ShellLayout.Body = Body;
ShellLayout.Footer = Footer;

export default ShellLayout;
