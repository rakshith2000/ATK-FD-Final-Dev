import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import type { AsyncOptionsConfig, FieldConfig, SelectOption } from './types';

export function getApiClient(type?: 'backend' | 'service-now') {
    return type === 'service-now' ? serviceNowApiClient : backendApiClient;
}

export function appendSearchParamToUrl(resolvedUrl: string, searchParam: string, separator: string): string {
    const dummyBase = 'http://localhost';
    const urlObj = new URL(resolvedUrl, dummyBase);

    const eqIdx = searchParam.indexOf('=');
    if (eqIdx !== -1) {
        const paramKey = searchParam.substring(0, eqIdx);
        const paramVal = decodeURIComponent(searchParam.substring(eqIdx + 1));

        const existing = urlObj.searchParams.get(paramKey);
        if (existing) {
            urlObj.searchParams.set(paramKey, `${existing}${separator}${paramVal}`);
        } else {
            urlObj.searchParams.set(paramKey, paramVal);
        }
    } else {
        const mainParamKey = separator === '^' ? 'sysparm_query' : 'search';
        const existing = urlObj.searchParams.get(mainParamKey);
        if (existing) {
            urlObj.searchParams.set(mainParamKey, `${existing}${separator}${searchParam}`);
        } else {
            urlObj.searchParams.set(mainParamKey, searchParam);
        }
    }

    const hasProtocol = resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://');
    if (hasProtocol) {
        return urlObj.toString();
    }
    const pathname = resolvedUrl.startsWith('/') ? urlObj.pathname : urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    return pathname + urlObj.search;
}

const DEFAULT_DEBOUNCE_MS = 300;
const STALE_TIME = 5 * 60 * 1000;

interface UseFieldOptionsResult {
    options: SelectOption[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    /** When `searchable` is true, this callback is provided for server-side search.
     *  Pass it as `optionsAsync` to SelectInput/MultiSelectInput.
     *  Results are cached via React Query (5 min stale time). */
    optionsAsync?: (searchTerm: string) => Promise<SelectOption[]>;
    /** Debounce delay for the async search (default: 300ms). */
    optionsAsyncDebounce?: number;
    /** Refetch/invalidate function for the field options. */
    refetch?: () => void;
    /** Trigger option fetching manually (e.g. on focus) */
    triggerFetch?: () => void;
}

/** Debounce a value - returns the latest value after `delay` ms of inactivity.
 *  Skips debounce on first render so initial options load immediately. */
function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip debounce on first render - load initial options immediately
        if (isFirstRender.current) {
            isFirstRender.current = false;
            setDebouncedValue(value);
            return;
        }

        if (delay <= 0) {
            setDebouncedValue(value);
            return;
        }

        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/** Resolve the URL string from a static or dynamic url config */
function resolveUrl(url: AsyncOptionsConfig['url'], dependencyValue?: unknown): string {
    if (typeof url === 'function') return url(dependencyValue);
    return url!;
}

/** Build the query key - use explicit queryKey if provided, otherwise derive from url */
function resolveQueryKey(asyncOptions: AsyncOptionsConfig, dependencyValue?: unknown): unknown[] {
    if (asyncOptions.queryKey) return asyncOptions.queryKey(dependencyValue);
    const url = asyncOptions.url;
    if (url) return ['dynamic-form-options', resolveUrl(url, dependencyValue), dependencyValue];
    return ['__noop__'];
}

/** Build the query key for a searchable field - includes search term for per-term caching */
function resolveSearchableQueryKey(asyncOptions: AsyncOptionsConfig, dependencyValue?: unknown, searchTerm?: string): unknown[] {
    const baseKey = resolveQueryKey(asyncOptions, dependencyValue);
    return [...baseKey, 'search', searchTerm ?? ''];
}

/** Build the query function - use queryFn if provided, otherwise fetch from url.
 *  The returned function accepts (dependencyValue, searchTerm?) - searchTerm is only
 *  used when `searchable` is true (called from optionsAsync). */
function resolveQueryFn(asyncOptions: AsyncOptionsConfig): (dependencyValue?: unknown, searchTerm?: string) => Promise<SelectOption[]> {
    // Explicit queryFn takes priority
    if (asyncOptions.queryFn) {
        if (asyncOptions.mapResponse) {
            const { queryFn, mapResponse } = asyncOptions;
            return async (depVal, searchTerm) => mapResponse(await queryFn(depVal, searchTerm));
        }
        return asyncOptions.queryFn;
    }

    // URL-based fetching
    if (asyncOptions.url) {
        return async (depVal, searchTerm) => {
            let resolvedUrl = resolveUrl(asyncOptions.url, depVal);
            // Append search term to the target query key when searchable
            if (asyncOptions.searchable && searchTerm) {
                const searchParamPattern = asyncOptions.searchQueryParam ?? (asyncOptions.apiClient === 'service-now' ? 'nameLIKE{searchTerm}' : '{searchTerm}');
                const searchExpr = searchParamPattern.replace('{searchTerm}', searchTerm);
                const queryKey = asyncOptions.searchQueryKey ?? (asyncOptions.apiClient === 'service-now' ? 'sysparm_query' : 'search');
                const separator = asyncOptions.searchQuerySeparator ?? (asyncOptions.apiClient === 'service-now' ? '^' : '&');

                const dummyBase = 'http://localhost';
                const urlObj = new URL(resolvedUrl, dummyBase);
                const existing = urlObj.searchParams.get(queryKey);
                if (existing) {
                    urlObj.searchParams.set(queryKey, `${existing}${separator}${searchExpr}`);
                } else {
                    urlObj.searchParams.set(queryKey, searchExpr);
                }
                const hasProtocol = resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://');
                if (hasProtocol) {
                    resolvedUrl = urlObj.toString();
                } else {
                    const pathname = resolvedUrl.startsWith('/') ? urlObj.pathname : urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
                    resolvedUrl = pathname + urlObj.search;
                }
            }
            interface AsyncOptionsWithMap {
                mapResponse?: (data: unknown) => SelectOption[];
            }
            const client = getApiClient(asyncOptions.apiClient);
            const { data } = await client.get(resolvedUrl);
            const optsWithMap = asyncOptions as AsyncOptionsWithMap;
            return optsWithMap.mapResponse ? optsWithMap.mapResponse(data) : (data as SelectOption[]);
        };
    }

    return () => Promise.resolve([]);
}

export function useFieldOptions(field: FieldConfig, dependencyValue?: unknown): UseFieldOptionsResult {
    const asyncOptions = field.asyncOptions;
    const debounceMs = asyncOptions?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    const isSearchable = !!asyncOptions?.searchable;
    const queryClient = useQueryClient();

    // Debounce the dependency value so rapid changes (e.g. typing) don't trigger a fetch per keystroke.
    // JSON.stringify(undefined) returns undefined, so we use 'null' as a safe sentinel.
    const stableDepValue = JSON.stringify(dependencyValue) ?? 'null';
    const debouncedDepStr = useDebouncedValue(stableDepValue, asyncOptions?.dependsOn ? debounceMs : 0);
    const debouncedDepValue = JSON.parse(debouncedDepStr) as unknown;

    const [hasBeenOpened, setHasBeenOpened] = useState(false);
    const queryFn = asyncOptions ? resolveQueryFn(asyncOptions) : undefined;

    // Non-searchable: standard React Query fetch
    const query = useQuery({
        queryKey: asyncOptions ? resolveQueryKey(asyncOptions, debouncedDepValue) : ['__noop__'],
        queryFn: () => queryFn!(debouncedDepValue),
        enabled: !!asyncOptions && !isSearchable && hasBeenOpened,
        staleTime: STALE_TIME,
    });

    // Searchable: prefetch initial empty-search on mount (before dropdown opens)
    const queryFnRef = useRef(queryFn);
    queryFnRef.current = queryFn;
    const depValueRef = useRef(debouncedDepValue);
    depValueRef.current = debouncedDepValue;
    const asyncOptionsRef = useRef(asyncOptions);
    asyncOptionsRef.current = asyncOptions;

    // For searchable fields, provide an optionsAsync callback that uses queryClient.fetchQuery for caching
    const optionsAsync = useCallback(
        async (searchTerm: string): Promise<SelectOption[]> => {
            const fn = queryFnRef.current;
            const ao = asyncOptionsRef.current;
            if (!fn || !ao) return [];
            const depVal = depValueRef.current;
            const key = resolveSearchableQueryKey(ao, depVal, searchTerm);
            return queryClient.fetchQuery({
                queryKey: key,
                queryFn: () => fn(depVal, searchTerm),
                staleTime: STALE_TIME,
            });
        },
        [queryClient, stableDepValue],
    );

    if (optionsAsync) {
        (optionsAsync as unknown as Record<string, unknown>).depKey = stableDepValue;
    }

    // Static options - return directly
    if (!asyncOptions) {
        return {
            options: field.options ?? [],
            isLoading: false,
            isError: false,
            error: null,
            triggerFetch: () => {},
        };
    }

    // Searchable mode - return optionsAsync callback (backed by React Query cache)
    if (isSearchable) {
        return {
            options: field.options ?? [],
            isLoading: false,
            isError: false,
            error: null,
            optionsAsync,
            optionsAsyncDebounce: asyncOptions.searchDebounceMs ?? DEFAULT_DEBOUNCE_MS,
            refetch: () => {
                return queryClient.invalidateQueries({
                    queryKey: resolveQueryKey(asyncOptions, depValueRef.current),
                });
            },
            triggerFetch: () => {},
        };
    }

    // Merge query results with fallback options from field.options (e.g. initial options
    // resolved from initialOptionLabelKey/initialOptionValueKey). This ensures the
    // currently-selected value always has a label available for ghost/fallback display,
    // even if the async results don't include it.
    const mergedOptions = useMemo(() => {
        const fetched = query.data;
        const fallback = field.options;
        if (!fetched) return fallback ?? [];
        if (!fallback || fallback.length === 0) return fetched;
        // Append fallback options whose values aren't already in fetched results
        const fetchedValues = new Set(fetched.map((o) => o.value));
        const extras = fallback.filter((o) => !fetchedValues.has(o.value));
        return extras.length > 0 ? [...fetched, ...extras] : fetched;
    }, [query.data, field.options]);

    return {
        options: mergedOptions,
        isLoading: query.isFetching,
        isError: query.isError,
        error: query.error as Error | null,
        refetch: () => {
            return query.refetch();
        },
        triggerFetch: () => {
            setHasBeenOpened(true);
        },
    };
}
