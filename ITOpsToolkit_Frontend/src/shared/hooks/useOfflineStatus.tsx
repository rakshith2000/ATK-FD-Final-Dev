import { useEffect, useState, useCallback, useRef } from 'react';
import logger from '../utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { resolvePublicAssetPath } from '../utils/resolve-public-asset-path';

interface NetworkConnection extends EventTarget {
    downlink?: number;
    effectiveType?: string;
    rtt?: number;
    addEventListener: (type: 'change', listener: () => void) => void;
    removeEventListener: (type: 'change', listener: () => void) => void;
}

interface NavigatorWithConnection extends Navigator {
    connection?: NetworkConnection;
}

export function useOfflineStatus(): boolean {
    const queryClient = useQueryClient();

    const [offline, setOffline] = useState<boolean>(() => {
        if (typeof navigator === 'undefined') return false;
        return !navigator.onLine;
    });

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevOfflineRef = useRef<boolean>(offline);

    const pauseAllQueries = useCallback(() => {
        logger.debug('Pausing all queries due to offline status');
        queryClient
            .getQueryCache()
            .getAll()
            .forEach((query) => {
                queryClient.cancelQueries({ queryKey: query.queryKey });
            });
        queryClient.setDefaultOptions({
            queries: { enabled: false },
        });
    }, [queryClient]);

    const resumeAndRefetchQueries = useCallback(() => {
        logger.debug('Resuming and refetching all mounted queries');
        queryClient.setDefaultOptions({
            queries: { enabled: true },
        });
        queryClient.refetchQueries({ type: 'active' }, { throwOnError: false });
    }, [queryClient]);

    // Enhanced network check using fetch with timeout
    const checkNetworkConnectivity = useCallback(async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const _response = await fetch(resolvePublicAssetPath('/favicon.ico'), {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return _response.ok;
        } catch (_error) {
            logger.debug('Network connectivity check failed:', _error);
            return false;
        }
    }, []);

    // Alternative check using a reliable external service (fallback)
    const checkExternalConnectivity = useCallback(async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            await fetch(resolvePublicAssetPath('/favicon.ico'), {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return true;
        } catch {
            return false;
        }
    }, []);

    // Comprehensive network status check
    const updateNetworkStatus = useCallback(async () => {
        const navigatorOnline = navigator.onLine;

        if (!navigatorOnline) {
            setOffline(true);
            logger.debug('Navigator reports offline');
            return;
        }

        const isConnected = await checkNetworkConnectivity();

        if (!isConnected) {
            const externalConnected = await checkExternalConnectivity();
            setOffline(!externalConnected);
            logger.debug(`Network check: ${externalConnected ? 'online' : 'offline'}`);
        } else {
            setOffline(false);
            logger.debug('Network check: online');
        }
    }, [checkNetworkConnectivity, checkExternalConnectivity]);

    // Debounced status update to avoid rapid changes
    const debouncedUpdateStatus = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            updateNetworkStatus();
        }, 500);
    }, [updateNetworkStatus]);

    // React to offline state changes - pause or resume queries
    useEffect(() => {
        const wasOffline = prevOfflineRef.current;

        if (offline && !wasOffline) {
            pauseAllQueries();
        } else if (!offline && wasOffline) {
            resumeAndRefetchQueries();
        }

        prevOfflineRef.current = offline;
    }, [offline, pauseAllQueries, resumeAndRefetchQueries]);

    useEffect(() => {
        updateNetworkStatus();

        const handleOnline = () => {
            logger.debug('Online event triggered');
            debouncedUpdateStatus();
        };

        const handleOffline = () => {
            logger.debug('Offline event triggered');
            setOffline(true);
        };

        const handleConnectionChange = () => {
            logger.debug('Connection change detected');
            debouncedUpdateStatus();
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                logger.debug('Tab became visible, checking network status');
                debouncedUpdateStatus();
            }
        };

        const handleFocus = () => {
            logger.debug('Window focused, checking network status');
            debouncedUpdateStatus();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const navigatorWithConnection = navigator as NavigatorWithConnection;
        if (navigatorWithConnection.connection) {
            navigatorWithConnection.connection.addEventListener('change', handleConnectionChange);
        }

        intervalRef.current = setInterval(() => {
            if (!offline) {
                updateNetworkStatus();
            }
        }, 30000);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);

            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            if (navigatorWithConnection.connection) {
                navigatorWithConnection.connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, [offline, debouncedUpdateStatus, updateNetworkStatus]);

    logger.debug(`Current network status: ${offline ? 'offline' : 'online'}`);
    return offline;
}
