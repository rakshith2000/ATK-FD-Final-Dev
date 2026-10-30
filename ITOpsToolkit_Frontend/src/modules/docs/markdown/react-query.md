# React Query (TanStack Query)

## Approach

The app uses **TanStack Query v5** for server-state management. Queries handle data fetching with built-in caching, and mutations.

## Folder Structure

```
src/
  providers/
    TanstackQueryClientProvider.tsx        QueryClient setup + default options
  routes/
    __root.tsx                             DevTools panel (ReactQueryDevtoolsPanel)
  App.tsx                                  Provider tree (AuthProvider > QueryClientProvider > Router)
```

## How It Works

1. DevTools are available via the TanStack DevTools panel in the root route.

## Diagram

### Provider Tree

```
App.tsx
  |
  +-- MuiThemeProvider
        |
        +-- AuthProvider
              |
              +-- TanstackQueryClientProvider  (QueryClient lives here)
                    |
                    +-- TanstackRouterProvider
                          |
                          +-- __root.tsx  (DevTools panel)
                                |
                                +-- Page components
                                      |
                                      +-- useQuery()     --> cached server data
                                      +-- useMutation()  --> side-effects (logout, etc.)
```

### Query Lifecycle

```
Component mounts
  |
  +-- useQuery({ queryKey, queryFn })
        |
        +-- cache HIT & fresh (< 5 min)?  --> return cached data
        |
        +-- cache MISS or stale?
              |
              +-- call queryFn (fetch data)
              |     |
              |     +-- success --> cache result, return data
              |     +-- error   --> return error (no retry by default)
              |
              +-- refetchOnWindowFocus: false  (no background refetch)
```

## Global Defaults

Configured in `src/providers/TanstackQueryClientProvider.tsx`:

| Option                 | Value   | Description                        |
| ---------------------- | ------- | ---------------------------------- |
| `retry`                | `false` | No automatic retries on failure    |
| `staleTime`            | `5 min` | Data stays fresh for 5 minutes     |
| `refetchOnWindowFocus` | `false` | No refetch when tab regains focus  |
| `mutations.retry`      | `false` | No automatic retries for mutations |

## Query Key Pattern

Keys are defined inline as arrays — resource name first, then optional scope:

```ts
['resource-name'][('resource-name', user?.uniqueId)]; // global // scoped to user
```

## Usage

### useQuery — fetching data

```tsx
import { useQuery } from '@tanstack/react-query';

const MyComponent = () => {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['my-data', user?.uniqueId],
        queryFn: () => fetchMyData(),
    });

    if (isLoading) return <p>Loading...</p>;
    if (isError) return <p>{error.message}</p>;

    return <p>{data}</p>;
};
```

### useMutation — side-effects

```tsx
import { useMutation } from '@tanstack/react-query';

const logoutMutation = useMutation({
    mutationFn: logout,
    onError: () => {
        // show error toast
    },
});

// trigger it
<button onClick={() => logoutMutation.mutateAsync()} disabled={logoutMutation.isPending}>
    Log out
</button>;
```

See `src/shared/components/AppHeader/AppHeader.tsx` for the full example.

### Overriding defaults per query

```tsx
useQuery({
    queryKey: ['snow-creds', user?.uniqueId],
    queryFn: () => getServiceNowDetails(),
    retry: true, // override global retry: false
    staleTime: 10 * 60 * 1000, // 10 min instead of default 5
});
```

## Accessing Query Data by Key in Other Places

Any component inside `TanstackQueryClientProvider` can read, update, or invalidate cached query data using `useQueryClient()`. You don't need to re-fetch — just reference the same
query key.

### Reading cached data

```tsx
import { useQueryClient } from '@tanstack/react-query';

const OtherComponent = () => {
    const queryClient = useQueryClient();

    // read whatever is already in the cache for this key (returns undefined if not cached)
    const cachedUser = queryClient.getQueryData(['msGraphMe', user?.uniqueId]);

    return <p>{cachedUser?.displayName}</p>;
};
```

### Updating cached data directly

```tsx
const queryClient = useQueryClient();

// overwrite the cached value without a network request
queryClient.setQueryData(['snow-creds', user?.uniqueId], newCreds);
```

### Invalidating queries (force refetch)

```tsx
const queryClient = useQueryClient();

// mark as stale — refetches automatically if a component is subscribed
queryClient.invalidateQueries({ queryKey: ['snow-creds'] });

// invalidate everything for a user
queryClient.invalidateQueries({ queryKey: ['snow-creds', user?.uniqueId] });
```

### Prefetching data

```tsx
const queryClient = useQueryClient();

// fetch and cache ahead of time (e.g. on hover, before navigation)
await queryClient.prefetchQuery({
    queryKey: ['my-data', user?.uniqueId],
    queryFn: () => fetchMyData(),
});
```

### Updating cache after a mutation

```tsx
const queryClient = useQueryClient();

const mutation = useMutation({
    mutationFn: updateItem,
    onSuccess: (newItem) => {
        // option 1: invalidate so it refetches
        queryClient.invalidateQueries({ queryKey: ['items'] });

        // option 2: update the cache directly (avoids extra request)
        queryClient.setQueryData(['items'], (old) => old?.map((item) => (item.id === newItem.id ? newItem : item)));
    },
});
```

### Quick reference

| Method              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `getQueryData(key)` | Read cached data (sync, no fetch)                    |
| `setQueryData(key)` | Write to cache directly (no fetch)                   |
| `invalidateQueries` | Mark stale, triggers refetch if component is mounted |
| `prefetchQuery`     | Fetch + cache in advance                             |
| `removeQueries`     | Delete from cache entirely                           |

## DevTools

React Query DevTools are available in the TanStack DevTools panel at the bottom-right of the screen during development. Configured in `src/routes/__root.tsx`.
