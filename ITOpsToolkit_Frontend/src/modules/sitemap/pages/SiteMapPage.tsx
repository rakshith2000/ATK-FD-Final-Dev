import { Link, useRouter } from '@tanstack/react-router';
import { Home, ChevronRight, ChevronDown, Layers, Layout, FileText, FolderOpen, ChevronsUpDown, ChevronsDownUp, Search, X } from 'lucide-react';
import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';

interface CrumbData {
    label?: string;
    icon?: ReactNode;
}

interface TreeNode {
    label: string;
    icon?: ReactNode;
    fullPath?: string;
    segment: string;
    isLayout: boolean;
    isIndex: boolean;
    children: TreeNode[];
}

function buildHierarchicalTree(router: ReturnType<typeof useRouter>): TreeNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routerAny = router as any;
    const flatRoutes: Array<{
        id: string;
        fullPath: string;
        options?: { staticData?: { crumb?: CrumbData } };
    }> = Object.values(routerAny.routesById ?? {});

    const root: TreeNode = {
        label: 'Home',
        icon: <Home className="h-3 w-3" />,
        fullPath: '/',
        segment: '__root__',
        isLayout: true,
        isIndex: false,
        children: [],
    };

    const nodeMap = new globalThis.Map<string, TreeNode>();
    nodeMap.set('', root);

    const sorted = [...flatRoutes].filter((r) => !r.fullPath.includes('login') && !r.fullPath.includes('logout')).sort((a, b) => a.id.split('/').length - b.id.split('/').length);

    // First pass: non-index routes (build the hierarchy)
    for (const route of sorted) {
        const routeId = route.id;
        if (routeId === '__root__') continue;
        if (routeId.endsWith('/')) continue; // handle index routes in second pass

        const segments = routeId.split('/').filter(Boolean);
        let currentPath = '';
        let parentNode = root;

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            currentPath += '/' + seg;
            const isLast = i === segments.length - 1;

            if (nodeMap.has(currentPath)) {
                parentNode = nodeMap.get(currentPath)!;
                continue;
            }

            const isLayoutGroup = seg.startsWith('(') && seg.endsWith(')');
            const isLayoutRoute = seg.startsWith('_');
            const isLayout = isLayoutGroup || isLayoutRoute;

            const crumb = isLast ? route.options?.staticData?.crumb : undefined;

            // Pathless layouts (_app) have fullPath '' - don't assign those
            // Layout groups (folders) don't have a navigable path
            const hasNavigablePath = isLast && route.fullPath && route.fullPath !== '';
            const shouldShowPath = hasNavigablePath && !isLayoutGroup;

            const node: TreeNode = {
                label: crumb?.label || formatSegment(seg),
                icon: isLast ? crumb?.icon : undefined,
                fullPath: shouldShowPath ? route.fullPath : undefined,
                segment: seg,
                isLayout,
                isIndex: false,
                children: [],
            };

            nodeMap.set(currentPath, node);
            parentNode.children.push(node);
            parentNode = node;
        }
    }

    // Second pass: index routes - create them as children of their parent
    for (const route of sorted) {
        const routeId = route.id;
        if (!routeId.endsWith('/')) continue;
        if (routeId === '__root__') continue;

        // Parent route ID is the same path without trailing "/"
        const parentId = routeId.slice(0, -1);
        const parentNode = nodeMap.get(parentId) || root;

        const crumb = route.options?.staticData?.crumb;

        const indexNode: TreeNode = {
            label: crumb?.label || parentNode.label,
            icon: crumb?.icon,
            fullPath: route.fullPath || undefined,
            segment: 'index',
            isLayout: false,
            isIndex: true,
            children: [],
        };

        parentNode.children.push(indexNode);
    }

    return root;
}

function formatSegment(segment: string): string {
    if (segment.startsWith('(') && segment.endsWith(')')) {
        return segment.slice(1, -1).replaceAll('-', ' ');
    }
    if (segment.startsWith('_')) {
        return segment.slice(1).replaceAll('-', ' ');
    }
    return segment.replaceAll('-', ' ');
}

type NodeType = 'root' | 'group' | 'layout' | 'route-layout' | 'index' | 'page';

function getNodeType(node: TreeNode): NodeType {
    if (node.segment === '__root__') return 'root';
    if (node.segment.startsWith('(') && node.segment.endsWith(')')) return 'group';
    if (node.segment.startsWith('_')) return 'layout';
    if (node.isIndex) return 'index';
    // A node with children that is not a group/layout is a route layout
    // (e.g. settings, itops-ai, transition-ai - they wrap children with <Outlet />)
    if (node.children.length > 0) return 'route-layout';
    return 'page';
}

const NODE_STYLES: Record<NodeType, { pill: string; icon: string }> = {
    root: {
        pill: 'bg-gray-100 text-gray-600',
        icon: 'text-gray-500',
    },
    group: {
        pill: 'bg-gray-100 text-gray-600',
        icon: 'text-gray-500',
    },
    layout: {
        pill: 'bg-gray-100 text-gray-600',
        icon: 'text-gray-500',
    },
    'route-layout': {
        pill: 'bg-gray-100 text-gray-600',
        icon: 'text-gray-500',
    },
    index: {
        pill: 'bg-gray-100 text-gray-600',
        icon: 'text-gray-500',
    },
    page: {
        pill: 'bg-gray-100 text-gray-600',
        icon: 'text-gray-500',
    },
};

const NODE_TYPE_LABELS: Record<NodeType, string> = {
    root: 'root',
    group: 'pseudo group',
    layout: 'pseudo layout',
    'route-layout': 'route layout',
    index: 'index page',
    page: 'page',
};

function getNodeIcon(node: TreeNode, type: NodeType): ReactNode {
    if (node.icon) return node.icon;
    if (type === 'root') return <Home className="h-3 w-3" />;
    if (type === 'group') return <FolderOpen className="h-3 w-3" />;
    if (type === 'layout') return <Layout className="h-3 w-3" />;
    if (type === 'route-layout') return <Layout className="h-3 w-3" />;
    if (type === 'index') return <Layers className="h-3 w-3" />;
    return <FileText className="h-3 w-3" />;
}

// Check if a node or any descendant matches the search
function nodeMatches(node: TreeNode, query: string): boolean {
    const q = query.toLowerCase();
    if (node.label.toLowerCase().includes(q)) return true;
    if (node.fullPath?.toLowerCase().includes(q)) return true;
    return node.children.some((child) => nodeMatches(child, q));
}

// Highlight matching text
function HighlightText({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="rounded-sm bg-yellow-200/80 px-px text-yellow-900">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
}

// Collect all node keys that have children
function collectExpandableKeys(node: TreeNode, path = ''): string[] {
    const key = path + '/' + node.segment;
    const keys: string[] = [];
    if (node.children.length > 0) {
        keys.push(key);
        for (const child of node.children) {
            keys.push(...collectExpandableKeys(child, key));
        }
    }
    return keys;
}

interface TreeNodeItemProps {
    node: TreeNode;
    depth?: number;
    path?: string;
    expandedKeys: Set<string>;
    onToggle: (key: string) => void;
    searchQuery: string;
}

function TreeNodeItem({ node, depth = 0, path = '', expandedKeys, onToggle, searchQuery }: TreeNodeItemProps) {
    const key = path + '/' + node.segment;
    const hasChildren = node.children.length > 0;
    const expanded = expandedKeys.has(key);
    const type = getNodeType(node);
    const styles = NODE_STYLES[type];
    const icon = getNodeIcon(node, type);

    // Filter children if searching
    const visibleChildren = searchQuery ? node.children.filter((child) => nodeMatches(child, searchQuery)) : node.children;

    // Hide this node if searching and neither it nor descendants match
    if (searchQuery && !nodeMatches(node, searchQuery)) return null;

    const row = (
        <div className="flex items-center gap-2 py-1.5">
            {hasChildren ? (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle(key);
                    }}
                    className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-600"
                >
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
            ) : (
                <span className="w-4 shrink-0" />
            )}

            <span className={`shrink-0 ${styles.icon}`}>{icon}</span>

            <span className="text-xs font-medium text-zinc-700">
                <HighlightText text={node.label} query={searchQuery} />
            </span>

            <span className={`rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-widest ${styles.pill}`}>{NODE_TYPE_LABELS[type]}</span>

            {node.fullPath && (
                <span className="ml-auto hidden shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] leading-none text-gray-500 sm:inline">
                    <HighlightText text={node.fullPath} query={searchQuery} />
                </span>
            )}
        </div>
    );

    return (
        <div>
            {node.fullPath ? (
                <Link to={node.fullPath} className="block cursor-pointer rounded-md px-2 transition-colors hover:bg-zinc-50">
                    {row}
                </Link>
            ) : (
                <div className={`rounded-md px-2 transition-colors hover:bg-zinc-50 ${hasChildren ? 'cursor-pointer' : ''}`} onClick={() => hasChildren && onToggle(key)}>
                    {row}
                </div>
            )}

            {hasChildren && expanded && visibleChildren.length > 0 && (
                <div className="ml-1 mt-0.5 space-y-0.5 border-l border-zinc-200/70 pl-3">
                    {visibleChildren.map((child, i) => (
                        <TreeNodeItem
                            key={child.segment + '-' + i}
                            node={child}
                            depth={depth + 1}
                            path={key}
                            expandedKeys={expandedKeys}
                            onToggle={onToggle}
                            searchQuery={searchQuery}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SiteMapPage() {
    const router = useRouter();
    const tree = useMemo(() => buildHierarchicalTree(router), [router]);

    const ROOT_KEY = '/__root__';

    // Expanded state - start with only root expanded
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set([ROOT_KEY]));

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Visibility filters
    const [showGroups, setShowGroups] = useState(false);
    const [showLayouts, setShowLayouts] = useState(false);
    const [showRouteLayouts, setShowRouteLayouts] = useState(true);

    // Filter tree based on visibility settings
    const filterTree = useCallback(
        (node: TreeNode): TreeNode => {
            const filtered = node.children
                .filter((child) => {
                    const type = getNodeType(child);
                    if (!showGroups && type === 'group') return false;
                    if (!showLayouts && type === 'layout') return false;
                    if (!showRouteLayouts && type === 'route-layout') return false;
                    return true;
                })
                .map((child) => filterTree(child));

            // For hidden group/layout nodes, hoist their children up
            const hoisted = node.children.flatMap((child) => {
                const type = getNodeType(child);
                const hidden = (!showGroups && type === 'group') || (!showLayouts && type === 'layout') || (!showRouteLayouts && type === 'route-layout');
                if (hidden) return filterTree(child).children;
                return [];
            });

            return { ...node, children: [...filtered, ...hoisted] };
        },
        [showGroups, showLayouts, showRouteLayouts],
    );

    const displayTree = useMemo(() => filterTree(tree), [filterTree, tree]);
    const displayAllKeys = useMemo(() => new Set(collectExpandableKeys(displayTree)), [displayTree]);

    // Reset expanded keys when filters change so expand/collapse stays in sync
    useEffect(() => {
        setExpandedKeys(new Set(displayAllKeys));
    }, [displayAllKeys]);

    const handleToggle = useCallback((key: string) => {
        if (key === ROOT_KEY) return; // root is always expanded
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        setExpandedKeys(new Set(displayAllKeys));
    }, [displayAllKeys]);

    const collapseAll = useCallback(() => {
        setExpandedKeys(new Set([ROOT_KEY]));
    }, []);

    // When searching, auto-expand everything so matches are visible
    const effectiveExpanded = searchQuery ? displayAllKeys : expandedKeys;

    const countNodes = (node: TreeNode): { pages: number; layouts: number; routeLayouts: number; groups: number; defaults: number } => {
        const type = getNodeType(node);
        const self = {
            pages: type === 'page' ? 1 : 0,
            layouts: type === 'layout' ? 1 : 0,
            routeLayouts: type === 'route-layout' ? 1 : 0,
            groups: type === 'group' ? 1 : 0,
            defaults: type === 'index' ? 1 : 0,
        };
        return node.children.reduce((acc, c) => {
            const child = countNodes(c);
            return {
                pages: acc.pages + child.pages,
                layouts: acc.layouts + child.layouts,
                routeLayouts: acc.routeLayouts + child.routeLayouts,
                groups: acc.groups + child.groups,
                defaults: acc.defaults + child.defaults,
            };
        }, self);
    };
    const counts = countNodes(displayTree);

    return (
        <div className="flex h-full w-full flex-col overflow-auto bg-white">
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-3 py-3 sm:px-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                            <Layers className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xs font-semibold text-zinc-800">Application Site Map</h1>
                            <p className="text-[10px] text-zinc-400">
                                {counts.pages} pages &middot; {counts.routeLayouts} route layouts &middot; {counts.layouts} layouts &middot; {counts.groups} groups
                            </p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search routes..."
                            className="h-7 w-full rounded-md border border-zinc-200 bg-zinc-50/50 pl-7 pr-7 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-0.5 text-zinc-400 transition-colors hover:text-zinc-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Visibility filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex uppercase h-7 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[10px] font-medium text-zinc-600 select-none">
                            <input type="checkbox" checked={showGroups} onChange={(e) => setShowGroups(e.target.checked)} className="h-3 w-3 accent-blue-500" />
                            {NODE_TYPE_LABELS.group}
                        </label>
                        <label className="flex uppercase h-7 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[10px] font-medium text-zinc-600 select-none">
                            <input type="checkbox" checked={showLayouts} onChange={(e) => setShowLayouts(e.target.checked)} className="h-3 w-3 accent-blue-500" />
                            {NODE_TYPE_LABELS.layout}
                        </label>
                        <label className="flex uppercase h-7 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[10px] font-medium text-zinc-600 select-none">
                            <input type="checkbox" checked={showRouteLayouts} onChange={(e) => setShowRouteLayouts(e.target.checked)} className="h-3 w-3 accent-blue-500" />
                            {NODE_TYPE_LABELS['route-layout']}
                        </label>

                        {/* Expand / Collapse buttons */}
                        <button
                            onClick={expandAll}
                            disabled={!!searchQuery}
                            className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-zinc-200 px-2.5 text-[10px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronsUpDown className="h-3 w-3" />
                            Expand All
                        </button>
                        <button
                            onClick={collapseAll}
                            disabled={!!searchQuery}
                            className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-zinc-200 px-2.5 text-[10px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronsDownUp className="h-3 w-3" />
                            Collapse All
                        </button>
                    </div>
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-auto px-3 py-3 sm:px-5 sm:py-5">
                <div className="w-full">
                    <TreeNodeItem node={displayTree} expandedKeys={effectiveExpanded} onToggle={handleToggle} searchQuery={searchQuery} />
                </div>
            </div>
        </div>
    );
}
