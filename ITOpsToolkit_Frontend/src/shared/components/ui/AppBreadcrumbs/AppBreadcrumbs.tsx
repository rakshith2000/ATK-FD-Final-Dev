import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react';
import { Breadcrumbs, Typography, Link as MuiLink, type SxProps, type Theme } from '@mui/material';
import { Link, useRouterState } from '@tanstack/react-router';
import { FaHome } from 'react-icons/fa';
import { HiDotsHorizontal } from 'react-icons/hi';

export interface AppBreadcrumbsProps {
    maxItems?: number;
    showHomeIcon?: boolean;
    sx?: SxProps<Theme>;
}

export function AppBreadcrumbs({ maxItems = 3, showHomeIcon = true, sx }: AppBreadcrumbsProps) {
    const [expanded, setExpanded] = useState(false);
    const [computedMax, setComputedMax] = useState(maxItems);
    const containerRef = useRef<HTMLElement>(null);

    const matches = useRouterState({ select: (s) => s.matches });
    const pathname = useRouterState({ select: (s) => s.location.pathname });

    const crumbs = useMemo(() => {
        const matchCrumbs = new Map(
            matches
                .filter((m): m is typeof m & { staticData: { crumb: { label: string; icon?: ReactNode } } } => !!m.staticData?.crumb)
                .map((m) => {
                    const key =
                        '/' +
                        m.routeId
                            .split('/')
                            .filter((seg) => seg && !seg.startsWith('_') && !seg.startsWith('('))
                            .join('/');
                    return [key, { label: m.staticData.crumb.label, icon: m.staticData.crumb.icon }];
                }),
        );

        const segments = pathname.split('/').filter(Boolean);

        const crumbs = segments.reduce<{ label: string; to: string; icon?: ReactNode }[]>((acc, seg, i) => {
            const to = '/' + segments.slice(0, i + 1).join('/');
            const match = matchCrumbs.get(to + '/') ?? matchCrumbs.get(to);
            acc.push({ to, label: match?.label ?? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), icon: match?.icon });
            return acc;
        }, []);

        if (showHomeIcon && crumbs?.length > 0) {
            if (crumbs[0]?.to !== '/') {
                crumbs.unshift({
                    label: '',
                    to: '/',
                    icon: <FaHome size={15} className="mr-1 mb-0.5 align-middle" color="var(--brand-color)" />,
                });
            }
        }
        return crumbs;
    }, [matches, pathname]);

    useEffect(() => {
        if (expanded) return;

        const container = containerRef.current;
        if (!container) return;

        const AVG_CRUMB_WIDTH = 220;
        const ELLIPSIS_WIDTH = 40;

        const measure = () => {
            const available = container.offsetWidth;
            const fittable = Math.max(1, Math.floor((available - ELLIPSIS_WIDTH) / AVG_CRUMB_WIDTH));
            setComputedMax(fittable);
        };

        measure();

        const ro = new ResizeObserver(measure);
        ro.observe(container);
        return () => ro.disconnect();
    }, [expanded, crumbs]);

    const effectiveMax = expanded ? crumbs.length : Math.min(maxItems, computedMax, crumbs.length);
    const safeMax = effectiveMax < 2 ? crumbs.length : effectiveMax;

    if (crumbs.length === 0 || safeMax === 0) return null;

    return (
        <Breadcrumbs
            ref={containerRef}
            separator="/"
            maxItems={safeMax}
            itemsBeforeCollapse={1}
            itemsAfterCollapse={1}
            expandText="Show full path"
            slots={{ CollapsedIcon: () => <HiDotsHorizontal size={15} className="mr-1 mb-0.5 align-middle" color="var(--brand-color)" /> }}
            slotProps={{
                collapsedIcon: {
                    onClick: () => setExpanded(true),
                    id: 'breadcrumbs-collapsed',
                },
            }}
            className="gradient-text"
            aria-label="breadcrumb"
            sx={{
                display: { xs: 'none', md: 'flex' },
                fontSize: '0.7rem',
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                '& li > .MuiButtonBase-root[aria-label="Show full path"]': {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 0,
                    margin: 0,
                    px: 0,
                    py: 0,
                    backgroundColor: 'transparent',
                    transition: 'all 0.15s ease',
                },
                ...sx,
            }}
        >
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;

                if (isLast)
                    return (
                        <Typography
                            key={crumb.to}
                            className="gradient-text"
                            aria-current="page"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: 500,
                                fontSize: 'inherit',
                                whiteSpace: 'nowrap',
                                color: 'var(--brand-color)',
                                letterSpacing: '0.03rem',
                            }}
                        >
                            {crumb?.icon}
                            {crumb.label}
                        </Typography>
                    );

                return (
                    <MuiLink
                        key={crumb.to}
                        component={Link}
                        to={crumb.to}
                        underline="hover"
                        className="gradient-text"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: 'inherit',
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.03rem',
                            '&:hover': {
                                color: 'var(--brand-color)',
                                fontWeight: 500,
                            },
                        }}
                    >
                        {crumb?.icon}
                        {crumb.label}
                    </MuiLink>
                );
            })}
        </Breadcrumbs>
    );
}
