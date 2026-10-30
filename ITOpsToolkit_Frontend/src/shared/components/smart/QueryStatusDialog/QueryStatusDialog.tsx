import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useMatchRoute } from '@tanstack/react-router';
import Modal from '@/shared/components/ui/Modal/Modal';
import LoadingPlaceholder from '@/shared/components/ui/Placeholders/LoadingPlaceholder';
import ErrorPlaceholder from '@/shared/components/ui/Placeholders/ErrorPlaceholder';

interface FailedQuery {
    queryKey: string;
    error: Error;
}
interface LoadingQuery {
    queryKey: string;
}

export interface RouteQueryConfig {
    path: string;
    maxLoadingQueries?: number;
    maxErrorQueries?: number;
}

export interface QueryStatusDialogProps {
    routes: RouteQueryConfig[];
    maxLoadingQueries?: number;
    maxErrorQueries?: number;
}

export function QueryStatusDialog({ routes, maxLoadingQueries: globalMaxLoading = 3, maxErrorQueries: globalMaxError = 2 }: QueryStatusDialogProps) {
    const matchRoute = useMatchRoute();
    const queryClient = useQueryClient();

    const [loadingQueries, setLoadingQueries] = useState<LoadingQuery[]>([]);
    const [failedQueries, setFailedQueries] = useState<FailedQuery[]>([]);
    const [isRetrying, setIsRetrying] = useState(false);

    const activeRoute = routes.find(({ path }) => !!matchRoute({ to: path, fuzzy: true }));

    useEffect(() => {
        queryClient
            .getQueryCache()
            .getAll()
            .forEach((query) => {
                const key = JSON.stringify(query.queryKey);
                const status = query.state.status;
                const fetchStatus = query.state.fetchStatus;

                if (status === 'pending' && fetchStatus === 'fetching') {
                    setLoadingQueries((prev) => (prev.some((q) => q.queryKey === key) ? prev : [...prev, { queryKey: key }]));
                }
                if (status === 'error') {
                    const error = query.state.error as Error;
                    setFailedQueries((prev) => (prev.some((q) => q.queryKey === key) ? prev : [...prev, { queryKey: key, error }]));
                }
            });

        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            if (event.type !== 'updated') return;

            const key = JSON.stringify(event.query.queryKey);
            const status = event.query.state.status;
            const fetchStatus = event.query.state.fetchStatus;

            if (status === 'pending' && fetchStatus === 'fetching') {
                setIsRetrying(false);
                setLoadingQueries((prev) => (prev.some((q) => q.queryKey === key) ? prev : [...prev, { queryKey: key }]));
            }
            if (fetchStatus === 'idle') {
                setLoadingQueries((prev) => prev.filter((q) => q.queryKey !== key));
            }
            if (status === 'error') {
                const error = event.query.state.error as Error;
                setFailedQueries((prev) => (prev.some((q) => q.queryKey === key) ? prev : [...prev, { queryKey: key, error }]));
            }
            if (status === 'success') {
                setFailedQueries((prev) => prev.filter((q) => q.queryKey !== key));
            }
        });

        return () => unsubscribe();
    }, [queryClient]);

    if (!activeRoute) return null;

    const maxLoading = activeRoute.maxLoadingQueries ?? globalMaxLoading;
    const maxError = activeRoute.maxErrorQueries ?? globalMaxError;

    const showLoadingDialog = loadingQueries.length >= maxLoading;
    const showErrorDialog = !showLoadingDialog && failedQueries.length >= maxError;

    const handleRetry = () => {
        setIsRetrying(true);
        setFailedQueries([]);
        queryClient.refetchQueries({ type: 'active' });
    };

    // Loading modal - shown during initial load or after retry triggered
    if (showLoadingDialog || isRetrying) {
        return (
            <Modal open size="xs" closeOnEscapeKeyDown={false} closeOnOutsideClick={false}>
                <Modal.Header>
                    <span className="text-sm font-semibold text-slate-800 flex-1"></span>
                </Modal.Header>

                <Modal.Body>
                    <LoadingPlaceholder iconSize={54} />
                </Modal.Body>
            </Modal>
        );
    }

    // Error modal - shown when enough queries fail and not currently loading
    if (showErrorDialog) {
        return (
            <Modal open size="xs" closeOnEscapeKeyDown={false} closeOnOutsideClick={false}>
                <Modal.Header></Modal.Header>

                <Modal.Body>
                    <ErrorPlaceholder error={failedQueries[0]?.error} onRetry={handleRetry} isRefetching={isRetrying} />
                </Modal.Body>
            </Modal>
        );
    }

    return null;
}
