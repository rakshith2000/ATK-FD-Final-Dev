import { useState } from 'react';
import { Search } from 'lucide-react';
import ImageWithUnknowExt from '@/shared/components/ui/ImageWithUnknowExt/ImageWithUnknowExt';
import TextInput from '@/shared/components/ui/InputFields/TextInput';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';

interface CategoryListProps {
    categories: string[];
    activeCategory: string;
    onSelect: (category: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, activeCategory, onSelect }) => {
    const [search, setSearch] = useState('');

    const normalizeKey = (s: string) => s?.trim().toLowerCase() ?? '';

    const normalizedSearch = normalizeKey(search);
    const filtered = categories.filter((c) => normalizeKey(c).includes(normalizedSearch));

    return (
        <div className="h-full overflow-y-auto border-r border-gray-200">
            <div className="px-3 py-2">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={14} />
                    <TextInput placeholder="Search categories..." value={search} onChange={setSearch} className="pl-8 pr-3 py-1.5 bg-gray-50 text-xs" />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="px-3 text-xs text-gray-500">No categories found</div>
            ) : (
                filtered.map((category) => {
                    const isActive = activeCategory === category;

                    return (
                        <button
                            key={category}
                            type="button"
                            onClick={() => onSelect(category)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                                isActive ? 'bg-(--brand-color) text-(--brand-text-inverse) font-medium' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <ImageWithUnknowExt
                                baseSrcWithoutFileExtension={resolvePublicAssetPath(`/assets/knowledge-ai/knowledge-category-icons/${category}`)}
                                alt={category}
                                fallbackSrc={resolvePublicAssetPath('/assets/shared/missing-image.svg')}
                                style={{ width: 16, height: 16, opacity: isActive ? 0.9 : 1 }}
                            />
                            {category}
                        </button>
                    );
                })
            )}
        </div>
    );
};

export default CategoryList;
