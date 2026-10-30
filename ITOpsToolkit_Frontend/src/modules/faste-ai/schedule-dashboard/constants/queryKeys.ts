const SCHEDULER_ROOT = ['scheduler'] as const;

export const queryKeys = {
    scheduler: {
        all: SCHEDULER_ROOT,
        dashboard: () => [...SCHEDULER_ROOT, 'dashboard'] as const,
        tasks: () => [...SCHEDULER_ROOT, 'tasks'] as const,
        task: (id: string) => [...SCHEDULER_ROOT, 'tasks', id] as const,
        sops: () => [...SCHEDULER_ROOT, 'sops'] as const,
        cis: () => [...SCHEDULER_ROOT, 'cis'] as const,
        reportPreview: (id: string) => [...SCHEDULER_ROOT, 'reportPreview', id] as const,
    },
} as const;
