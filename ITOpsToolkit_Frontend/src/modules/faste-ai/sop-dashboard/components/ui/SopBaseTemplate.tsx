import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FaThLarge, FaDesktop, FaCloud, FaLinux, FaDatabase, FaNetworkWired, FaLaptopCode, FaLayerGroup, FaMagic, FaTimes, FaSync } from 'react-icons/fa';
import Modal from '@/shared/components/ui/Modal/Modal';
import { EmptyPlaceholder } from '@/shared/components/ui/Placeholders';
import RichTextEditor, { RichTextEditorContent } from '@/shared/modules/rich-text-editor';
import SelectInput from '@/shared/components/ui/InputFields/SelectInput';
import { sopTextToHtml, extractSOPContentText, extractKbNumber } from '../../utils/sopFormatting';
import SOPContentActions from './SopContentActions';

export interface SopCardData {
    id: string;
    title: string;
    author: string;
    status: 'Approved' | 'Awaiting Approval';
    category?: 'Windows' | 'Linux' | 'Network' | 'Database' | 'Cloud' | 'Others' | 'Application' | string;
    isHighlighted?: boolean;
    sop_content?: string;
    sop_type?: string;
    u_sop_type?: string;
    kb_number?: string;
}

interface SopBaseTemplateProps {
    pageTitle: string;
    items: SopCardData[];
    onEnhance: (item: SopCardData) => void;
    onCardClick?: (item: SopCardData) => void;
    onDelete?: (id: string) => void;
    showSidebar?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

const SOP_TYPE_OPTIONS = [
    { value: 'all', label: 'All SOP Types' },
    { value: 'event_based', label: 'Event Based' },
    { value: 'schedule_based', label: 'Scheduled Based' },
];

const extractSopId = (content?: string): string | null => {
    const text = extractSOPContentText(content);
    if (!text) return null;
    const match = text.match(/SOP[_\s]*ID\s*:\s*(.+)/i);
    if (!match) return null;
    const id = match[1].split(/\r?\n/)[0].trim();
    return id || null;
};

function useGridColumnCount(containerRef: React.RefObject<HTMLDivElement | null>): number {
    const [columns, setColumns] = useState(4);

    useEffect(() => {
        const updateColumns = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            if (width >= 1600) {
                setColumns(4);
            } else if (width >= 1200) {
                setColumns(4);
            } else if (width >= 900) {
                setColumns(3);
            } else if (width >= 600) {
                setColumns(2);
            } else {
                setColumns(1);
            }
        };

        updateColumns();
        const observer = new ResizeObserver(updateColumns);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [containerRef]);

    return columns;
}

export default function SopBaseTemplate({ pageTitle, items, onEnhance, onCardClick, onDelete, showSidebar = false, onRefresh, isRefreshing = false }: SopBaseTemplateProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTower, setActiveTower] = useState('All');
    const [sopTypeFilter, setSopTypeFilter] = useState<'all' | 'event_based' | 'schedule_based'>('all');
    const [selectedSOP, setSelectedSOP] = useState<SopCardData | null>(null);

    const parentRef = useRef<HTMLDivElement>(null);
    const columnCount = useGridColumnCount(parentRef);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || String(item.id).toLowerCase().includes(searchQuery.toLowerCase());

            const matchesTower = activeTower === 'All' || item.category?.toLowerCase() === activeTower.toLowerCase();

            const rawType = (item.u_sop_type || item.sop_type || '').toLowerCase();
            let matchesType = true;
            if (sopTypeFilter === 'event_based') {
                matchesType = rawType.includes('event');
            } else if (sopTypeFilter === 'schedule_based') {
                matchesType = rawType.includes('sched');
            }

            return matchesSearch && matchesTower && matchesType;
        });
    }, [items, searchQuery, activeTower, sopTypeFilter]);

    const rows = useMemo(() => {
        const result: SopCardData[][] = [];
        for (let i = 0; i < filteredItems.length; i += columnCount) {
            result.push(filteredItems.slice(i, i + columnCount));
        }
        return result;
    }, [filteredItems, columnCount]);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 150,
        overscan: 5,
    });

    const handleDelete = (e: React.MouseEvent, id: string): void => {
        e.preventDefault();
        e.stopPropagation();
        if (onDelete) {
            onDelete(id);
        }
    };

    const handleCardClick = (item: SopCardData): void => {
        setSelectedSOP(item);
        if (onCardClick) {
            onCardClick(item);
        }
    };

    const handleEnhanceClick = (e: React.MouseEvent, item: SopCardData): void => {
        e.preventDefault();
        e.stopPropagation();
        onEnhance(item);
    };

    return (
        <div className="w-full h-[calc(100vh-12px)] overflow-hidden bg-[#f8fafd] flex flex-col p-2.5 md:p-3 relative">
            {/* Top Header Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-2.5 shrink-0">
                <h1 className="text-base font-bold text-[#011a80] tracking-wide">{pageTitle}</h1>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
                    <div className="relative flex-1 md:w-52">
                        <span className="absolute inset-y-0 left-2.5 flex items-center text-gray-400">
                            <Search size={14} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search SOPs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-2.5 py-1 text-xs focus:outline-none focus:border-[#3b5cd7] transition-all"
                        />
                    </div>

                    <div className="w-40">
                        <SelectInput
                            value={sopTypeFilter}
                            onChange={(val) => setSopTypeFilter((val || 'all') as 'all' | 'event_based' | 'schedule_based')}
                            options={SOP_TYPE_OPTIONS}
                            placeholder="Select SOP Type"
                            clearable={false}
                            triggerClassName="bg-white border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1 h-[30px] focus:border-[#3b5cd7]"
                        />
                    </div>

                    <div className="bg-[#011a80] text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs whitespace-nowrap h-7.5 flex items-center">
                        Total SOPs: <span className="ml-1 text-xs">{filteredItems.length}</span>
                    </div>

                    {onRefresh && (
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="bg-white text-[#3b5cd7] border border-[#bce0ff] hover:bg-blue-50 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 h-7.5"
                            title="Refresh SOPs"
                        >
                            <FaSync className={isRefreshing ? 'animate-spin' : ''} size={11} />
                            <span>Refresh</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex gap-2.5 overflow-hidden items-start min-h-0">
                {showSidebar && (
                    <div className="w-12 bg-white border border-gray-200 rounded-xl p-1.5 flex flex-col items-center gap-2 shadow-xs shrink-0 h-fit py-2">
                        {[
                            { id: 'All', icon: <FaThLarge size={13} /> },
                            { id: 'Windows', icon: <FaDesktop size={13} /> },
                            { id: 'Cloud', icon: <FaCloud size={13} /> },
                            { id: 'Linux', icon: <FaLinux size={13} /> },
                            { id: 'Database', icon: <FaDatabase size={13} /> },
                            { id: 'Network', icon: <FaNetworkWired size={13} /> },
                            { id: 'Application', icon: <FaLaptopCode size={13} /> },
                            { id: 'Others', icon: <FaLayerGroup size={13} /> },
                        ].map((tower) => (
                            <button
                                key={tower.id}
                                onClick={() => setActiveTower(tower.id)}
                                className={twMerge(
                                    'w-8.5 h-8.5 rounded-lg flex items-center justify-center transition-all border border-transparent cursor-pointer',
                                    activeTower === tower.id
                                        ? 'bg-[#e3f2fd] text-[#3b5cd7] border-[#bce0ff] shadow-xs font-bold'
                                        : 'bg-[#f8fafd] text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                                )}
                                title={tower.id}
                            >
                                {tower.icon}
                            </button>
                        ))}
                    </div>
                )}

                {filteredItems.length === 0 ? (
                    <div className="flex-1 h-full flex items-center justify-center bg-white rounded-xl border border-gray-200">
                        <EmptyPlaceholder message="No incidents found" isRefetching={isRefreshing} onRetry={onRefresh} />
                    </div>
                ) : (
                    <div
                        ref={parentRef}
                        className="flex-1 h-full overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300"
                    >
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize() + 80}px`,
                                width: '100%',
                                position: 'relative',
                                paddingBottom: '80px',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const rowItems = rows[virtualRow.index];
                                return (
                                    <div
                                        key={virtualRow.key}
                                        ref={virtualizer.measureElement}
                                        data-index={virtualRow.index}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <div className="grid gap-2.5 w-full pb-3" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
                                            {rowItems.map((sop) => {
                                                const displayTitle = extractSopId(sop.sop_content) || sop.title;
                                                const displayKbNumber = extractKbNumber(sop.sop_content, sop.kb_number);
                                                return (
                                                    <div
                                                        key={sop.id}
                                                        onClick={() => handleCardClick(sop)}
                                                        className="bg-white border border-[#d6ebff] rounded-lg p-2.5 shadow-xs hover:bg-[#EEF6FF] cursor-pointer transition-all flex flex-col justify-between relative min-h-28.5"
                                                        style={{ boxShadow: '0px 0px 12px 0px rgba(89, 172, 255, 0.25) inset' }}
                                                    >
                                                        <span
                                                            onClick={(e) => handleDelete(e, sop.id)}
                                                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 font-bold text-xs cursor-pointer leading-none z-10 flex items-center justify-center border-none bg-transparent"
                                                        >
                                                            <FaTimes size={11} />
                                                        </span>

                                                        <div>
                                                            <h3 className="text-xs font-bold text-gray-800 mb-0.5 truncate pr-4" title={displayTitle}>
                                                                {displayTitle}
                                                            </h3>
                                                            <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                                                By: <span className="font-semibold text-gray-600 truncate max-w-22.5">{sop.author}</span>
                                                                <span
                                                                    className={twMerge(
                                                                        'ml-1 px-1 py-0.2 rounded font-bold text-[9px] whitespace-nowrap',
                                                                        sop.status === 'Approved' ? 'text-[#2a9619] bg-[#e6f4ea]' : 'text-amber-700 bg-amber-50',
                                                                    )}
                                                                >
                                                                    {sop.status}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                                                                KB Number: <span className="font-semibold text-gray-600 truncate">{displayKbNumber}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end mt-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleEnhanceClick(e, sop)}
                                                                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 shadow-xs bg-white text-[#004fc4] border-[#bce0ff] hover:bg-[#004fc4] hover:text-white hover:border-[#004fc4]"
                                                            >
                                                                <FaMagic className="text-[8px]" /> Enhance
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <Modal
                open={Boolean(selectedSOP)}
                size="3xl"
                onClose={() => setSelectedSOP(null)}
                closeButtonClassName="top-2 right-2 w-7 h-7 rounded-xl bg-gray-100/90 hover:bg-gray-200 text-gray-500 border border-gray-200/50 flex items-center justify-center transition-colors shadow-xs"
            >
                <Modal.Header className="pt-1.5 px-2.5 mb-1.5 pr-12 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-(--brand-title-primary-color,#011a80) font-bold flex items-center gap-1.5 text-xs md:text-sm">
                            <FileText className="text-(--brand-title-primary-color,#011a80) shrink-0" size={15} />
                            <span>{extractSopId(selectedSOP?.sop_content) || selectedSOP?.title || 'SOP Content Blueprint'}</span>
                        </h2>
                        {selectedSOP && (
                            <p className="text-[10px] text-gray-400 font-normal tracking-wide pl-5">
                                Author: {selectedSOP.author} • Status: {selectedSOP.status}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <SOPContentActions content={selectedSOP?.sop_content} fileName={selectedSOP?.title} />
                    </div>
                </Modal.Header>

                <Modal.Body className="p-0.5 border border-[#c3e0ff] shadow-[inset_0px_0px_12px_0px_rgba(89,172,255,0.18)] rounded-xl bg-white max-h-[60vh] overflow-y-auto mx-2.5 my-1">
                    {selectedSOP?.sop_content ? (
                        <RichTextEditor
                            key={selectedSOP.id || selectedSOP.title}
                            initialHtml={sopTextToHtml(selectedSOP.sop_content)}
                            isEditable={false}
                            theme="sop"
                            preserveInitialHtml={{ classes: true, styles: true, head: true }}
                            className="w-full my-0 mx-0 border-0 shadow-none bg-transparent max-w-none"
                        >
                            <RichTextEditorContent className="min-h-0 max-h-none overflow-visible bg-transparent p-0" />
                        </RichTextEditor>
                    ) : (
                        <p className="text-slate-400 text-xs italic p-2">No description content provided for this SOP.</p>
                    )}
                </Modal.Body>

                <Modal.Footer className="justify-end pt-1 pb-2 pr-2.5 mt-0.5">
                    <button
                        type="button"
                        onClick={(e) => {
                            if (selectedSOP) {
                                const itemToEnhance = selectedSOP;
                                setSelectedSOP(null);
                                handleEnhanceClick(e, itemToEnhance);
                            }
                        }}
                        className="bg-[#004fc4] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xs hover:bg-[#003da1] transition-all flex items-center gap-1 cursor-pointer"
                    >
                        <FaMagic size={11} /> Enhance This SOP
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
