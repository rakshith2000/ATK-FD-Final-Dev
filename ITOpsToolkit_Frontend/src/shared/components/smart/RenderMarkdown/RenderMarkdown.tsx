import { Link } from '@tanstack/react-router';
import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar, PolarArea, Scatter, Bubble } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { Copy, Check, Maximize2, AlertTriangle, BarChart3, Code, ZoomIn, ZoomOut, RotateCcw, Move, Download, ExternalLink } from 'lucide-react';
import { useCopyText } from '@/shared/hooks/useCopyText';
import Modal from '@/shared/components/ui/Modal/Modal';
import { downloadSnowAttachment } from '@/shared/modules/servicenow/services/download-snow-attachment';
import logger from '@/shared/utils/logger';

ChartJS.register(...registerables);

// --- Public API -------------------------------------------------------

interface RenderMarkdownProps {
    text: string;
}

const RenderMarkdown: React.FC<RenderMarkdownProps> = ({ text }) => (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
        {text}
    </ReactMarkdown>
);

export default RenderMarkdown;

// --- Helpers ----------------------------------------------------------

/** Recursively extracts text/HTML representation from React children, preserving line breaks and tags. */
const extractText = (children: React.ReactNode): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(extractText).join('');
    if (React.isValidElement(children)) {
        const type = typeof children.type === 'string' ? children.type.toLowerCase() : '';
        const props = children.props as { children?: React.ReactNode; className?: string };
        if (type === 'br') return '<br/>';
        if (type === 'hr') return '\n---\n';
        if (props?.children !== undefined) {
            return extractText(props.children);
        }
        return '';
    }
    return '';
};

const MERMAID_KEYWORDS =
    /^\s*(graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline|gitGraph|zenuml|sankey-beta|quadrantChart|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|requirementDiagram|journey|packet-beta)/m;

/** Detects if raw code block text represents a Mermaid diagram. */
const isMermaidContent = (text: string): boolean => MERMAID_KEYWORDS.test(text.trim());

/** Detects if raw code block text represents a Chart.js configuration. */
const isChartContent = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
    try {
        const obj = JSON.parse(trimmed);
        return obj && typeof obj === 'object' && typeof obj.type === 'string' && obj.data !== undefined;
    } catch {
        return false;
    }
};

/** Mounts parsed SVG element directly into the DOM tree without dangerouslySetInnerHTML. */
const SvgContainer: React.FC<{ svg: string; className?: string }> = ({ svg, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const renderSvg = (node: HTMLDivElement | null) => {
        if (!node || !svg) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'text/html');
        const svgEl = doc.body.querySelector('svg');
        if (svgEl) {
            node.replaceChildren(svgEl);
        }
    };

    useEffect(() => {
        if (containerRef.current) {
            renderSvg(containerRef.current);
        }
    }, [svg]);

    return (
        <div
            ref={(node) => {
                containerRef.current = node;
                renderSvg(node);
            }}
            className={className}
        />
    );
};

// --- Pan & Zoom Interactive Viewer ------------------------------------

interface PanZoomViewerProps {
    children: React.ReactNode;
    className?: string;
}

const PanZoomViewer: React.FC<PanZoomViewerProps> = ({ children, className = '' }) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const panStartRef = useRef({ x: 0, y: 0 });

    const handleZoomIn = () => setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 8));
    const handleZoomOut = () => setZoom((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.25));
    const handleReset = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        panStartRef.current = { ...pan };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPan({
            x: panStartRef.current.x + dx,
            y: panStartRef.current.y + dy,
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.25), 8));
    };

    return (
        <div className="relative w-full h-full flex-1 flex flex-col bg-slate-50/60 rounded-lg border border-slate-200 overflow-hidden select-none">
            {/* Floating Zoom & Pan Control Bar */}
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-md">
                <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.25}
                    className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Zoom Out"
                    aria-label="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={handleReset}
                    className="px-2 py-0.5 text-xs font-mono font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Reset Zoom (100%)"
                >
                    {Math.round(zoom * 100)}%
                </button>
                <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 8}
                    className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Zoom In"
                    aria-label="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200 mx-0.5" />
                <button
                    type="button"
                    onClick={handleReset}
                    className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Reset Zoom & Position"
                    aria-label="Reset Zoom & Position"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 pl-1 text-[0.7rem] text-slate-400 font-medium">
                    <Move className="w-3 h-3" />
                    <span>Drag to pan</span>
                </div>
            </div>

            {/* Interactive Canvas Area */}
            <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                className={`w-full h-full flex-1 flex items-center justify-center p-6 overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
            >
                <div
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                    }}
                    className="w-full h-full flex items-center justify-center pointer-events-auto"
                >
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Mermaid Diagram --------------------------------------------------

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);
    const [showSource, setShowSource] = useState(false);
    const { copied, copy } = useCopyText();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setError('');
                const mermaid = (await import('mermaid')).default;
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose',
                    suppressErrorRendering: true,
                });
                const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
                const { svg: rendered } = await mermaid.render(id, chart);
                if (!cancelled) setSvg(rendered);
            } catch (err: unknown) {
                if (!cancelled) {
                    const message = err instanceof Error ? err.message : String(err);
                    setError(message);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [chart]);

    const openModal = () => {
        setShowSource(false);
        setIsOpen(true);
    };

    if (error) {
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs shadow-xs">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-red-700 font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>Mermaid Diagram Syntax / Render Error</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => copy(chart)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.7rem] font-medium bg-red-100 hover:bg-red-200 text-red-700 transition-colors cursor-pointer"
                        title="Copy diagram source"
                    >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy Code'}</span>
                    </button>
                </div>
                <div className="font-mono text-[0.7rem] bg-white/90 rounded p-2.5 text-red-600 border border-red-100 whitespace-pre-wrap wrap-break-word mb-2.5">{error}</div>
                <div className="text-[0.7rem] text-slate-600 font-medium mb-1">Diagram Source Code:</div>
                <pre className="bg-slate-900 text-slate-200 rounded p-2.5 font-mono text-[0.68rem] overflow-x-auto">
                    <code>{chart}</code>
                </pre>
            </div>
        );
    }

    if (!svg) {
        return (
            <div className="text-xs text-slate-400 p-4 bg-slate-50 rounded-lg border border-slate-200 my-2.5 animate-pulse flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                <span>Rendering Mermaid diagram…</span>
            </div>
        );
    }

    return (
        <>
            <div className="group relative my-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs hover:border-slate-300 transition-colors">
                {/* Floating Top-Right Actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1 rounded-md border border-slate-200 shadow-xs z-10">
                    <button
                        type="button"
                        onClick={() => copy(chart)}
                        className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={copied ? 'Copied diagram code!' : 'Copy Mermaid code'}
                        aria-label="Copy Mermaid code"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={openModal}
                        className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Enlarge diagram (Fullscreen)"
                        aria-label="Enlarge diagram"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <SvgContainer svg={svg} className="flex justify-center overflow-x-auto max-w-full" />
            </div>

            {/* Enlarge Fullscreen Modal */}
            <Modal open={isOpen} onClose={() => setIsOpen(false)} size="full" className="p-4 sm:p-6 flex flex-col h-full">
                <Modal.Header className="border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-semibold text-gray-800">Mermaid Diagram Fullscreen View</h3>
                    </div>
                </Modal.Header>

                <Modal.Body className="space-y-3 flex-1 flex flex-col min-h-0 mb-3">
                    <div className="flex items-center justify-between gap-2 flex-none">
                        <span className="text-xs text-gray-500">Interactive Diagram Canvas</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowSource(!showSource)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <Code className="w-3.5 h-3.5" />
                                {showSource ? 'Hide Source' : 'View Source'}
                            </button>
                            <button
                                type="button"
                                onClick={() => copy(chart)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium transition-colors cursor-pointer"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied!' : 'Copy Code'}
                            </button>
                        </div>
                    </div>

                    {showSource && (
                        <div className="relative flex-none rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-200 max-h-48 overflow-y-auto">
                            <pre className="overflow-x-auto">
                                <code>{chart}</code>
                            </pre>
                        </div>
                    )}

                    <PanZoomViewer>
                        <SvgContainer
                            svg={svg}
                            className="flex justify-center items-center [&>svg]:max-w-none [&>svg]:h-auto shadow-xs p-4 bg-white rounded-lg border border-slate-100"
                        />
                    </PanZoomViewer>
                </Modal.Body>

                <Modal.Footer className="border-t border-gray-100 pt-2.5">
                    <Modal.ActionButton variant="secondary" onClick={() => setIsOpen(false)} className="flex-none px-6">
                        Close
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>
        </>
    );
};

// --- Chart.js Block ---------------------------------------------------

const CHART_MAP: Record<string, React.ComponentType<{ data: ChartData<never>; options?: ChartOptions<never> }>> = {
    bar: Bar as never,
    line: Line as never,
    pie: Pie as never,
    doughnut: Doughnut as never,
    radar: Radar as never,
    polararea: PolarArea as never,
    scatter: Scatter as never,
    bubble: Bubble as never,
};

interface ChartConfig {
    type: string;
    data: ChartData;
    options?: ChartOptions;
}

const ChartBlock: React.FC<{ config: string }> = ({ config }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showSource, setShowSource] = useState(false);
    const { copied, copy } = useCopyText();

    let parsed: ChartConfig;
    try {
        parsed = JSON.parse(config);
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Invalid JSON syntax';
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs shadow-xs">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-red-700 font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>Chart Configuration JSON Syntax Error</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => copy(config)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.7rem] font-medium bg-red-100 hover:bg-red-200 text-red-700 transition-colors cursor-pointer"
                        title="Copy chart configuration"
                    >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                </div>
                <div className="font-mono text-[0.7rem] bg-white/90 rounded p-2.5 text-red-600 border border-red-100 whitespace-pre-wrap wrap-break-word mb-2.5">{errorMsg}</div>
                <div className="text-[0.7rem] text-slate-600 font-medium mb-1">Chart Source JSON:</div>
                <pre className="bg-slate-900 text-slate-200 rounded p-2.5 font-mono text-[0.68rem] overflow-x-auto">
                    <code>{config}</code>
                </pre>
            </div>
        );
    }

    if (!parsed || typeof parsed !== 'object') {
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>Invalid Chart Configuration</span>
                </div>
                <p className="text-red-600">
                    Expected a JSON object with at least <code className="font-mono bg-red-100 px-1 py-0.5 rounded">type</code> and{' '}
                    <code className="font-mono bg-red-100 px-1 py-0.5 rounded">data</code> properties.
                </p>
            </div>
        );
    }

    const { type, data, options } = parsed;

    if (!type) {
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>Missing Chart Type</span>
                </div>
                <p className="text-red-600">
                    The <code className="font-mono bg-red-100 px-1 py-0.5 rounded">&quot;type&quot;</code> property is required. Supported types:{' '}
                    {Object.keys(CHART_MAP).join(', ')}.
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>Missing Chart Data</span>
                </div>
                <p className="text-red-600">
                    The <code className="font-mono bg-red-100 px-1 py-0.5 rounded">&quot;data&quot;</code> property is required (e.g. labels and datasets).
                </p>
            </div>
        );
    }

    const ChartComp = CHART_MAP[type.toLowerCase()];

    if (!ChartComp) {
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>Unsupported Chart Type: &quot;{type}&quot;</span>
                </div>
                <p className="text-red-600">Supported chart types are: {Object.keys(CHART_MAP).join(', ')}.</p>
            </div>
        );
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        ...options,
    };

    const modalChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        ...options,
    };

    const openModal = () => {
        setShowSource(false);
        setIsOpen(true);
    };

    return (
        <>
            <div className="group relative my-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs hover:border-slate-300 transition-colors">
                {/* Floating Top-Right Actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1 rounded-md border border-slate-200 shadow-xs z-10">
                    <button
                        type="button"
                        onClick={() => copy(config)}
                        className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={copied ? 'Copied chart JSON!' : 'Copy Chart JSON'}
                        aria-label="Copy Chart JSON"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={openModal}
                        className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Enlarge chart (Fullscreen)"
                        aria-label="Enlarge chart"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="w-full flex justify-center">
                    <ChartComp data={data as never} options={chartOptions as never} />
                </div>
            </div>

            {/* Enlarge Fullscreen Modal */}
            <Modal open={isOpen} onClose={() => setIsOpen(false)} size="full" className="p-4 sm:p-6 flex flex-col h-full">
                <Modal.Header className="border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-semibold text-gray-800 capitalize">{type} Chart Fullscreen View</h3>
                    </div>
                </Modal.Header>

                <Modal.Body className="space-y-3 flex-1 flex flex-col min-h-0 mb-3">
                    <div className="flex items-center justify-between gap-2 flex-none">
                        <span className="text-xs text-gray-500">Interactive Chart Canvas</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowSource(!showSource)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <Code className="w-3.5 h-3.5" />
                                {showSource ? 'Hide JSON' : 'View JSON'}
                            </button>
                            <button
                                type="button"
                                onClick={() => copy(config)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium transition-colors cursor-pointer"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied!' : 'Copy JSON'}
                            </button>
                        </div>
                    </div>

                    {showSource && (
                        <div className="relative flex-none rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-200 max-h-48 overflow-y-auto">
                            <pre className="overflow-x-auto">
                                <code>{config}</code>
                            </pre>
                        </div>
                    )}

                    <PanZoomViewer>
                        <div className="w-[85vw] max-w-5xl h-[65vh] max-h-175 flex items-center justify-center p-4 bg-white rounded-lg border border-slate-100 shadow-xs">
                            <ChartComp data={data as never} options={modalChartOptions as never} />
                        </div>
                    </PanZoomViewer>
                </Modal.Body>

                <Modal.Footer className="border-t border-gray-100 pt-2.5">
                    <Modal.ActionButton variant="secondary" onClick={() => setIsOpen(false)} className="flex-none px-6">
                        Close
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>
        </>
    );
};

// --- Copy Button for Code Blocks --------------------------------------

const CodeBlockCopyButton: React.FC<{ text: string }> = ({ text }) => {
    const { copied, copy } = useCopyText();

    return (
        <button
            type="button"
            onClick={() => copy(text)}
            className="absolute cursor-pointer top-2 right-2 p-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label={copied ? 'Copied' : 'Copy code'}
            title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
};

// --- Design Tokens ----------------------------------------------------

const t = 'text-(--brand-text-color)';
const th = 'text-(--brand-title-primary-color)';
const b = 'border-(--brand-border-color)';

// Compact size tokens
const sz = {
    h1: 'text-sm',
    h2: 'text-x',
    h3: 'text-xs',
    body: 'text-xs',
    sm: 'text-xs',
    xs: 'text-[0.7rem]',
} as const;

// --- Image Renderer with ServiceNow Attachment Support & Enlarge Modal ---

const snowAttachmentCache = new Map<string, Promise<string>>();

const decodeUrlEntities = (url: string): string => {
    return url.replaceAll('&#61;', '=').replaceAll('&equals;', '=').replaceAll('%3D', '=').replaceAll('%3d', '=').replaceAll('&amp;', '&');
};

const getSnowAttachmentSysId = (rawSrc?: string): string | null => {
    if (!rawSrc) return null;
    const decoded = decodeUrlEntities(rawSrc);
    const match =
        decoded.match(/(?:^|[\/?&])sys_attachment\.do\?(?:[^"'\s>]*&)?(?:sys_id|sysid)=([a-f0-9]{32})/i) || decoded.match(/\/api\/now\/attachment\/([a-f0-9]{32})\/file/i);
    return match ? match[1] : null;
};

const MarkdownImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown }> = ({ node, src, alt, title, className: cls, style, ...rest }) => {
    const snowSysId = getSnowAttachmentSysId(src);
    const isSnow = Boolean(snowSysId);
    const [snowBlobUrl, setSnowBlobUrl] = useState<string | null>(null);
    const [isLoadingSnow, setIsLoadingSnow] = useState<boolean>(() => isSnow);
    const [hasSnowError, setHasSnowError] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!snowSysId) return;

        let isCancelled = false;
        setIsLoadingSnow(true);
        setHasSnowError(false);

        let promise = snowAttachmentCache.get(snowSysId);
        if (!promise) {
            promise = (async () => {
                const { blob } = await downloadSnowAttachment({
                    attachmentSysId: snowSysId,
                    fileName: alt || 'servicenow_image',
                });
                return URL.createObjectURL(blob);
            })();
            snowAttachmentCache.set(snowSysId, promise);
        }

        promise
            .then((blobUrl) => {
                if (!isCancelled) {
                    setSnowBlobUrl(blobUrl);
                    setIsLoadingSnow(false);
                }
            })
            .catch((err) => {
                logger.error(`Failed to download ServiceNow attachment ${snowSysId}`, err);
                snowAttachmentCache.delete(snowSysId);
                if (!isCancelled) {
                    setHasSnowError(true);
                    setIsLoadingSnow(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [snowSysId, alt]);

    if (hasSnowError) {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-2 my-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs shadow-xs">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>Failed to load ServiceNow attachment {snowSysId ? `(${snowSysId})` : ''}</span>
            </span>
        );
    }

    if (isLoadingSnow) {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-2 my-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs shadow-xs animate-pulse">
                <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin shrink-0" />
                <span>Loading ServiceNow image…</span>
            </span>
        );
    }

    const imageSrc = isSnow ? (snowBlobUrl ?? undefined) : src;
    if (!imageSrc) return null;

    return (
        <>
            <span className="group relative inline-block max-w-full my-2.5 align-middle">
                <img
                    src={imageSrc}
                    alt={alt ?? ''}
                    title={title ?? 'Click to enlarge'}
                    loading="lazy"
                    onClick={() => setIsModalOpen(true)}
                    className={`rounded-md max-w-full h-auto border ${b} shadow-sm cursor-pointer transition-all hover:brightness-95 hover:shadow-md ${cls ?? ''}`}
                    style={style}
                    {...rest}
                />
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-white/90 backdrop-blur-xs border border-slate-200 shadow-xs text-slate-600 hover:text-slate-900 hover:bg-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer z-10"
                    title="Enlarge image"
                    aria-label="Enlarge image"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
            </span>

            {/* Enlarge Fullscreen Modal */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} size="full" className="p-4 sm:p-6 flex flex-col h-full">
                <Modal.Header className="border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center justify-between w-full pr-8">
                        <div className="flex items-center gap-2">
                            <Maximize2 className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-sm font-semibold text-gray-800">{alt || title || 'Image Enlarge View'}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={imageSrc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                                title="Open in new tab"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open</span>
                            </a>
                            <a
                                href={imageSrc}
                                download={`${snowSysId}_image`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium transition-colors cursor-pointer"
                                title="Download image"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                            </a>
                        </div>
                    </div>
                </Modal.Header>

                <Modal.Body className="flex-1 flex flex-col min-h-0 mb-2 overflow-hidden p-0">
                    <PanZoomViewer className="w-full h-full min-h-[60vh]">
                        <img src={imageSrc} alt={alt ?? ''} className="max-w-full max-h-full object-contain rounded select-none pointer-events-none" draggable={false} />
                    </PanZoomViewer>
                </Modal.Body>
            </Modal>
        </>
    );
};

// --- Markdown Component Overrides -------------------------------------
// Every override:
//  • destructures `node` (react-markdown AST node) to keep it off the DOM
//  • merges incoming `className` / `style` with our Tailwind classes
//  • spreads `...rest` so all other HTML attrs (id, data-*, aria-*, etc.) pass through

const MARKDOWN_COMPONENTS: Components = {
    // -- Headings ----------------------------------------------

    // # Heading 1
    h1: ({ node, children, className: cls, style, ...rest }) => (
        <h1 className={`${sz.h1} font-bold ${th} mt-5 mb-2 leading-tight tracking-tight border-b ${b} pb-2 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </h1>
    ),
    // ## Heading 2
    h2: ({ node, children, className: cls, style, ...rest }) => (
        <h2 className={`${sz.h2} font-bold ${th} mt-4 mb-1.5 leading-tight ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </h2>
    ),
    // ### Heading 3
    h3: ({ node, children, className: cls, style, ...rest }) => (
        <h3 className={`${sz.h3} font-semibold ${th} mt-3 mb-1.5 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </h3>
    ),
    // #### Heading 4
    h4: ({ node, children, className: cls, style, ...rest }) => (
        <h4 className={`${sz.sm} font-semibold ${th} mt-2.5 mb-1 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </h4>
    ),
    // ##### Heading 5
    h5: ({ node, children, className: cls, style, ...rest }) => (
        <h5 className={`${sz.xs} font-semibold ${th} mt-2 mb-1 uppercase tracking-wider ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </h5>
    ),
    // ###### Heading 6
    h6: ({ node, children, className: cls, style, ...rest }) => (
        <h6 className={`${sz.xs} font-semibold ${t} mt-2 mb-1 uppercase tracking-widest opacity-60 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </h6>
    ),

    // -- Block -------------------------------------------------

    // Plain paragraph text
    p: ({ node, children, className: cls, style, ...rest }) => (
        <p className={`${sz.body} ${t} leading-relaxed mb-2 last:mb-0 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </p>
    ),
    // > Quoted text
    blockquote: ({ node, children, className: cls, style, ...rest }) => (
        <blockquote className={`border-l-[3px] border-indigo-400 pl-3 pr-2 py-1 my-2.5 rounded-r-md bg-indigo-50/50 ${sz.body} ${t} italic ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </blockquote>
    ),
    // --- or *** or ___
    hr: ({ node, className: cls, style, ...rest }) => <hr className={`border-0 border-t ${b} my-3 ${cls ?? ''}`} style={style} {...rest} />,

    // ```code block``` — detects mermaid / chart blocks and skips pre wrapper for them
    pre: ({ node, children, className: cls, style, ...rest }) => {
        const child = React.Children.toArray(children)[0];
        if (React.isValidElement(child)) {
            const childCls = (child.props as { className?: string }).className ?? '';
            const childText = extractText((child.props as { children?: React.ReactNode }).children).trim();
            if (childCls.includes('language-mermaid') || childCls.includes('language-chart') || isMermaidContent(childText) || isChartContent(childText)) {
                return (
                    <div className={cls} style={style}>
                        {children}
                    </div>
                );
            }
        }

        // Normal code block — relative wrapper for the copy button overlay
        const codeText = extractText(children);
        return (
            <div className="relative group">
                <CodeBlockCopyButton text={codeText} />
                <pre
                    className={`bg-slate-900 rounded-lg px-3 py-2.5 overflow-x-auto ${sz.xs} font-mono mb-2.5 border border-slate-800 leading-relaxed ${cls ?? ''}`}
                    style={style}
                    {...rest}
                >
                    {children}
                </pre>
            </div>
        );
    },
    // <section>
    section: ({ node, children, className: cls, style, ...rest }) => (
        <section className={`mb-3 last:mb-0 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </section>
    ),
    // <article>
    article: ({ node, children, className: cls, style, ...rest }) => (
        <article className={`mb-3 p-2.5 border ${b} rounded-md ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </article>
    ),
    // <aside>
    aside: ({ node, children, className: cls, style, ...rest }) => (
        <aside className={`mb-2.5 p-2.5 border-l-4 border-indigo-300 bg-indigo-50/40 rounded-r-md ${sz.body} ${t} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </aside>
    ),
    // <div>
    div: ({ node, children, className: cls, style, ...rest }: React.HTMLAttributes<HTMLDivElement> & { node?: unknown }) => (
        <div className={`mb-1.5 last:mb-0 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </div>
    ),
    // <nav>
    nav: ({ node, children, className: cls, style, ...rest }) => (
        <nav className={`mb-2.5 p-2 rounded-md bg-slate-50 border ${b} ${sz.body} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </nav>
    ),

    // -- Inline ------------------------------------------------

    // [text](url "title")
    a: ({ node, href, title, children, className: cls, style, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) => {
        const linkClass = `text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition-colors break-all ${cls ?? ''}`;
        const isExternal = href?.startsWith('http') || href?.startsWith('//');
        const isHash = href?.startsWith('#');

        if (isExternal || isHash) {
            return (
                <a
                    href={href}
                    title={title}
                    {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
                    rel="noopener noreferrer"
                    className={linkClass}
                    style={style}
                    {...rest}
                >
                    {children}
                </a>
            );
        }

        const [path, queryString] = (href ?? '/').split('?');
        const search = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : undefined;

        return (
            <Link to={path} search={search} title={title} className={linkClass} style={style}>
                {children}
            </Link>
        );
    },
    // **bold**
    strong: ({ node, children, className: cls, style, ...rest }) => (
        <strong className={`font-semibold ${th} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </strong>
    ),
    // *italic*
    em: ({ node, children, className: cls, style, ...rest }) => (
        <em className={`italic ${t} opacity-80 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </em>
    ),
    // ~~strikethrough~~
    del: ({ node, children, className: cls, style, ...rest }) => (
        <del className={`line-through opacity-50 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </del>
    ),
    // <mark>highlighted</mark>
    mark: ({ node, children, className: cls, style, ...rest }) => (
        <mark className={`bg-amber-100 text-amber-800 px-0.5 rounded ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </mark>
    ),
    // <span>
    span: ({ node, children, className: cls, style, ...rest }) => (
        <span className={`${t} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </span>
    ),
    // <sup>superscript</sup>
    sup: ({ node, children, className: cls, style, ...rest }) => (
        <sup className={`${sz.xs} text-indigo-500 align-super leading-none ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </sup>
    ),
    // <sub>subscript</sub>
    sub: ({ node, children, className: cls, style, ...rest }) => (
        <sub className={`${sz.xs} ${t} align-sub leading-none ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </sub>
    ),
    // <small>small</small>
    small: ({ node, children, className: cls, style, ...rest }) => (
        <small className={`${sz.xs} ${t} opacity-70 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </small>
    ),
    // <ins>inserted</ins>
    ins: ({ node, children, className: cls, style, ...rest }) => (
        <ins className={`underline decoration-emerald-500 decoration-2 not-italic ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </ins>
    ),
    // <cite>citation</cite>
    cite: ({ node, children, className: cls, style, ...rest }) => (
        <cite className={`italic ${sz.body} ${t} opacity-80 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </cite>
    ),
    // <var>variable</var>
    var: ({ node, children, className: cls, style, ...rest }) => (
        <var className={`font-mono italic text-indigo-600 ${sz.xs} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </var>
    ),
    // <samp>output</samp>
    samp: ({ node, children, className: cls, style, ...rest }) => (
        <samp className={`font-mono ${sz.xs} bg-slate-100 text-emerald-600 px-1.5 py-0.5 rounded border border-slate-200 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </samp>
    ),
    // <dfn>definition</dfn>
    dfn: ({ node, children, className: cls, style, ...rest }) => (
        <dfn className={`italic font-medium ${th} underline decoration-dotted ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </dfn>
    ),
    // <abbr title="...">abbr</abbr>
    abbr: ({ node, children, title, className: cls, style, ...rest }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) => (
        <abbr title={title} className={`underline decoration-dotted cursor-help ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </abbr>
    ),
    // <kbd>Ctrl+C</kbd>
    kbd: ({ node, children, className: cls, style, ...rest }) => (
        <kbd
            className={`inline-flex items-center font-mono ${sz.xs} bg-slate-100 border border-slate-300 border-b-2 text-slate-700 rounded px-1.5 py-0.5 shadow-sm ${cls ?? ''}`}
            style={style}
            {...rest}
        >
            {children}
        </kbd>
    ),
    // <q>inline quote</q>
    q: ({ node, children, cite: c, className: cls, style, ...rest }: React.QuoteHTMLAttributes<HTMLQuoteElement> & { node?: unknown }) => (
        <q cite={c} className={`italic ${sz.body} ${t} before:content-['"'] after:content-['"'] ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </q>
    ),
    // <time datetime="2024-01-01">Jan 1</time>
    time: ({ node, children, dateTime, className: cls, style, ...rest }: React.TimeHTMLAttributes<HTMLTimeElement> & { node?: unknown }) => (
        <time dateTime={dateTime} className={`${sz.xs} font-mono ${t} opacity-80 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </time>
    ),
    // <address>contact</address>
    address: ({ node, children, className: cls, style, ...rest }) => (
        <address className={`not-italic ${sz.body} ${t} border-l-2 ${b} pl-3 my-2 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </address>
    ),
    // two trailing spaces or <br>
    br: ({ node, className: cls, style, ...rest }) => <br className={`block my-1 ${cls ?? ''}`} style={style} {...rest} />,
    // <wbr> (word break opportunity)
    wbr: ({ node, ...rest }) => <wbr {...rest} />,
    // <bdi> (bidirectional isolate)
    bdi: ({ node, children, className: cls, style, ...rest }) => (
        <bdi className={cls} style={style} {...rest}>
            {children}
        </bdi>
    ),
    // <bdo dir="rtl"> (bidirectional override)
    bdo: ({ node, children, dir, className: cls, style, ...rest }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) => (
        <bdo dir={dir} className={cls} style={style} {...rest}>
            {children}
        </bdo>
    ),

    // -- Code --------------------------------------------------

    // ```lang\ncode\n``` (fenced block) or `inline code`
    code: ({ node, children, className: cls, style, ...rest }) => {
        const codeText = extractText(children).trim();

        // -- Mermaid diagrams (explicit language-mermaid OR auto-detected mermaid syntax) --
        if (cls?.includes('language-mermaid') || isMermaidContent(codeText)) {
            return <MermaidDiagram chart={codeText} />;
        }

        // -- Chart.js charts (explicit language-chart OR auto-detected chart config) --
        if (cls?.includes('language-chart') || isChartContent(codeText)) {
            return <ChartBlock config={codeText} />;
        }

        // -- Fenced code block --
        if (cls?.includes('language-')) {
            return (
                <code className={`block font-mono ${sz.xs} text-slate-200 ${cls ?? ''}`} style={style} {...rest}>
                    {children}
                </code>
            );
        }

        // -- Inline code (with click-to-copy) --
        return (
            <code
                className={`font-mono ${sz.xs} bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded border-none border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors ${cls ?? ''}`}
                style={style}
                title="Click to copy"
                onClick={() => navigator.clipboard.writeText(codeText)}
                {...rest}
            >
                {children}
            </code>
        );
    },

    // -- Lists -------------------------------------------------

    // - item  or  * item
    ul: ({ node, children, className: cls, style, ...rest }) => (
        <ul className={`list-disc list-outside pl-4 space-y-0.5 mb-2 ${sz.body} ${t} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </ul>
    ),
    // 1. item
    ol: ({ node, children, className: cls, style, ...rest }) => (
        <ol className={`list-decimal list-outside pl-4 space-y-0.5 mb-2 ${sz.body} ${t} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </ol>
    ),
    // - list item content
    li: ({ node, children, className: cls, style, ...rest }) => (
        <li className={`${sz.body} ${t} leading-relaxed pl-1 marker:text-slate-400 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </li>
    ),
    // - [x] done  or  - [ ] todo
    input: ({ node, type, checked, disabled, className: cls, style, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { node?: unknown }) => (
        <input
            type={type}
            checked={checked}
            disabled={disabled}
            readOnly
            className={`mr-1.5 mt-0.5 align-middle accent-indigo-500 cursor-default ${cls ?? ''}`}
            style={style}
            {...rest}
        />
    ),

    // -- Definition list ---------------------------------------

    // <dl> wrapper
    dl: ({ node, children, className: cls, style, ...rest }) => (
        <dl className={`mb-2.5 rounded-md border ${b} overflow-hidden divide-y divide-(--brand-border-color) ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </dl>
    ),
    // <dt>term</dt>
    dt: ({ node, children, className: cls, style, ...rest }) => (
        <dt className={`${sz.xs} font-semibold ${th} uppercase tracking-wider bg-slate-50 px-3 py-1 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </dt>
    ),
    // <dd>definition</dd>
    dd: ({ node, children, className: cls, style, ...rest }) => (
        <dd className={`${sz.body} ${t} px-3 py-1 pl-5 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </dd>
    ),

    // -- Table -------------------------------------------------

    // | col | col |\n|-----|-----|
    table: ({ node, children, className: cls, style, ...rest }) => (
        <div className={`overflow-x-auto mb-2.5 rounded-md border ${b}`}>
            <table className={`w-full ${sz.body} border-collapse ${cls ?? ''}`} style={style} {...rest}>
                {children}
            </table>
        </div>
    ),
    // header row section
    thead: ({ node, children, className: cls, style, ...rest }) => (
        <thead className={`bg-slate-50 border-b ${b} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </thead>
    ),
    // body rows section
    tbody: ({ node, children, className: cls, style, ...rest }) => (
        <tbody className={`divide-y ${b} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </tbody>
    ),
    // footer row section
    tfoot: ({ node, children, className: cls, style, ...rest }) => (
        <tfoot className={`bg-slate-50 border-t ${b} font-medium ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </tfoot>
    ),
    // | cell | cell |
    tr: ({ node, children, className: cls, style, ...rest }) => (
        <tr className={`hover:bg-slate-50/80 transition-colors border ${b} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </tr>
    ),
    // | **Header** |
    th: ({ node, children, className: cls, style, ...rest }) => (
        <th className={`text-left ${sz.xs} font-semibold ${th} uppercase tracking-wider px-3 py-1.5 whitespace-nowrap border ${b} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </th>
    ),
    // | cell data |
    td: ({ node, children, className: cls, style, ...rest }) => (
        <td className={`px-3 py-1.5 ${sz.xs} ${t} align-top border ${b} ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </td>
    ),

    // -- Media -------------------------------------------------

    // ![alt](src "title")
    img: MarkdownImage,
    // <video src="...">
    video: ({ node, src, className: cls, style, ...rest }: React.VideoHTMLAttributes<HTMLVideoElement> & { node?: unknown }) => (
        <video src={src} controls className={`rounded-md w-full my-2.5 border ${b} ${cls ?? ''}`} style={style} {...rest} />
    ),
    // <audio src="...">
    audio: ({ node, src, className: cls, style, ...rest }: React.AudioHTMLAttributes<HTMLAudioElement> & { node?: unknown }) => (
        <audio src={src} controls className={`w-full my-2 ${cls ?? ''}`} style={style} {...rest} />
    ),
    // <figure>
    figure: ({ node, children, className: cls, style, ...rest }) => (
        <figure className={`my-3 flex flex-col items-center gap-1.5 ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </figure>
    ),
    // <figcaption>caption</figcaption>
    figcaption: ({ node, children, className: cls, style, ...rest }) => (
        <figcaption className={`${sz.xs} ${t} opacity-60 text-center ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </figcaption>
    ),

    // -- Interactive --------------------------------------------

    // <details>
    details: ({ node, children, className: cls, style, ...rest }) => (
        <details className={`group mb-2.5 border ${b} rounded-md overflow-hidden open:shadow-sm ${cls ?? ''}`} style={style} {...rest}>
            {children}
        </details>
    ),

    // <summary>label</summary>
    summary: ({ node, children, className: cls, style, ...rest }) => (
        <summary
            className={`flex items-center justify-between px-3 py-1.5 ${sz.body} font-semibold ${th} cursor-pointer select-none list-none bg-slate-50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden after:content-['▸'] after:text-slate-400 after:${sz.xs} after:transition-transform group-open:after:rotate-90 ${cls ?? ''}`}
            style={style}
            {...rest}
        >
            {children}
        </summary>
    ),
};
