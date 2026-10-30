import { twMerge } from 'tailwind-merge';

const RatingBadge = ({ rating }: { rating: string }) => {
    const num = parseFloat(rating) || 0;
    const color =
        num >= 4
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : num >= 3
              ? 'text-amber-700 bg-amber-50 border border-amber-200'
              : 'text-rose-700 bg-rose-50 border border-rose-200';
    return <span className={twMerge('text-xs min-w-max font-semibold px-2.5 py-1 rounded', color)}>Rating : ★ {num}</span>;
};

export default RatingBadge;
