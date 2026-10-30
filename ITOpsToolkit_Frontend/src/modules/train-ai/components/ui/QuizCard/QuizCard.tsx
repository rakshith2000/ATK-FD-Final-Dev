import type { CSSProperties, ReactNode } from 'react';

interface QuizCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon?: ReactNode;
    style?: CSSProperties;
}

const QuizCard: React.FC<QuizCardProps> = ({ title, value, subtitle, icon, style }) => {
    return (
        <div
            className="relative overflow-hidden rounded-xl p-4 text-white flex flex-col min-h-20 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-default"
            style={style}
        >
            {/* Decorative background shapes */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

            {/* Icon badge */}
            {icon && <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">{icon}</div>}

            <div className="relative z-10">
                <p className="text-[0.7rem] font-medium opacity-90 uppercase tracking-wider pr-9">{title}</p>
                <p className="text-2xl font-bold mt-1 leading-none">{value}</p>
                <p className="text-[0.65rem] opacity-80 mt-1">{subtitle}</p>
            </div>
        </div>
    );
};

export default QuizCard;
