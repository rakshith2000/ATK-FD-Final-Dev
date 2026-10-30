import type React from 'react';

const FieldInfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ children, title }) => {
    return (
        <div className="flex flex-col gap-1.5 p-1.5 rounded-md shadow-2xs border border-(--brand-color)/10 ring-1 ring-(--brand-color)/10">
            <span className="text-[0.625rem] font-bold text-(--brand-title-primary-color) uppercase tracking-wider">{title}</span>
            <span className="inline-flex items-center justify-start gap-2 text-[0.625rem] font-extrabold">{children}</span>
        </div>
    );
};

export default FieldInfoCard;
