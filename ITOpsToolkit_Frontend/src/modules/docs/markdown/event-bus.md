# Event Bus (mitt)

## Approach

The app uses **mitt** (a ~200B event emitter) for loosely-coupled, cross-component communication. Each feature gets its own typed event bus — a singleton module that any React
component or plain TS file can import and emit to.

This avoids prop drilling, context coupling, and lets non-React code (API utilities, services) trigger UI updates without depending on React.

## Folder Structure

```
src/shared/features/
  GlobalAlertDialog/
    types.d.ts                              Event + payload types
    global-alert-dialog-event-bus.ts        mitt instance (singleton)
    useGlobalAlertDialogController.tsx      Hook that subscribes (.on/.off)
    GlobalAlertDialog.tsx                   Renders the dialog
  GlobalAlertToast/
    types.d.ts                              Event + payload types
    global-alert-toast-event-bus.ts         mitt instance (singleton)
    useGlobalAlertToastController.ts        Hook that subscribes (.on/.off)
    GlobalAlertToast.tsx                    Renders the toasts
src/api/utils/
  emit-api-response-status-alert.ts         Helper to emit from non-React code
```

## How It Works

1. A **mitt instance** is created per feature with typed events and exported as a singleton.
2. A **controller hook** subscribes on mount (`.on`) and unsubscribes on unmount (`.off`).
3. Any code — React component, Axios interceptor, utility function — imports the bus and calls `.emit()`.
4. The controller hook updates React state, which re-renders the UI component.

## Diagram

### Event Bus Flow

```
Producers (emit)                        Consumer (on)

React components ----+                  +-- useGlobalAlertDialogController
                     |                  |       |
API utilities -------+--> Event Bus ---+        +-- GlobalAlertDialog.tsx
                     |   (singleton)    |
Services/hooks ------+                  +-- useGlobalAlertToastController
                                                |
                                                +-- GlobalAlertToast.tsx
```

### Per-Feature Pattern

```
1. Define types          types.d.ts
      |
2. Create bus            mitt<MyFeatureEvent>()  --> export singleton
      |
3. Subscribe in hook     useEffect: bus.on('event', handler)
      |                  cleanup:   bus.off('event', handler)
      |
4. Emit from anywhere    bus.emit('event', payload)
```

## Existing Event Buses

### GlobalAlertDialog

Shows a modal dialog with priority queueing.

**Event:** `'show-dialog'`

| Field             | Type                                        | Required | Description                   |
| ----------------- | ------------------------------------------- | -------- | ----------------------------- |
| title             | string                                      | yes      | Dialog title                  |
| note              | string                                      | yes      | Dialog body text              |
| severity          | 'error' \| 'warning' \| 'info' \| 'success' | yes      | Severity level                |
| autoCloseDuration | number                                      | no       | Auto-close after ms           |
| buttonText        | string                                      | no       | Custom button label           |
| onButtonClick     | () => void                                  | no       | Button click callback         |
| priority          | 'normal' \| 'high'                          | no       | High priority jumps the queue |

### GlobalAlertToast

Shows toast notifications at configurable positions.

**Event:** `'show-alert-toast'`

| Field             | Type                                        | Required | Description                            |
| ----------------- | ------------------------------------------- | -------- | -------------------------------------- |
| title             | string                                      | yes      | Toast title                            |
| description       | string                                      | no       | Toast body text                        |
| severity          | 'success' \| 'error' \| 'warning' \| 'info' | no       | Severity level                         |
| autoCloseDuration | number                                      | no       | Auto-close after ms (default 3s)       |
| position          | AlertToastPosition                          | no       | One of 6 positions (default top-right) |
| id                | string                                      | no       | Custom ID (auto-generated if omitted)  |

**AlertToastPosition:** `'top-left'` | `'top-center'` | `'top-right'` | `'bottom-left'` | `'bottom-center'` | `'bottom-right'`

## Usage

### Emitting from a React component

```tsx
import globalAlertToastEventBus from '@/shared/features/GlobalAlertToast/global-alert-toast-event-bus';

const MyComponent = () => {
    const handleError = () => {
        globalAlertToastEventBus.emit('show-alert-toast', {
            title: 'Something went wrong',
            severity: 'error',
            position: 'top-right',
        });
    };

    return <button onClick={handleError}>Test</button>;
};
```

### Emitting from non-React code (API utils, services, interceptors)

```ts
import globalAlertDialogEventBus from '@/shared/features/GlobalAlertDialog/global-alert-dialog-event-bus';

export function showApiError(message: string) {
    globalAlertDialogEventBus.emit('show-dialog', {
        title: 'API Error',
        note: message,
        severity: 'error',
    });
}
```

See `src/api/utils/emit-api-response-status-alert.ts` for the real helper that wraps both buses.

### Subscribing in a React hook (useEffect pattern)

```tsx
import { useEffect } from 'react';
import myEventBus from './my-event-bus';

useEffect(() => {
    const handler = (payload) => {
        /* update state */
    };

    myEventBus.on('my-event', handler);
    return () => {
        myEventBus.off('my-event', handler);
    };
}, []);
```

## How to Add a New Event Bus

1. Create a `types.d.ts` with the event map:

```ts
export type MyFeaturePayload = {
    message: string;
};

export type MyFeatureEvent = {
    'my-event': MyFeaturePayload;
};
```

2. Create the bus singleton:

```ts
import mitt from 'mitt';
import type { MyFeatureEvent } from './types';

const myFeatureEventBus = mitt<MyFeatureEvent>();

export default myFeatureEventBus;
```

3. Create a controller hook that subscribes:

```ts
import { useEffect, useState } from 'react';
import myFeatureEventBus from './my-feature-event-bus';
import type { MyFeaturePayload } from './types';

export function useMyFeatureController() {
    const [data, setData] = useState<MyFeaturePayload | null>(null);

    useEffect(() => {
        const handler = (payload: MyFeaturePayload) => setData(payload);

        myFeatureEventBus.on('my-event', handler);
        return () => {
            myFeatureEventBus.off('my-event', handler);
        };
    }, []);

    return { data };
}
```

4. Emit from anywhere:

```ts
import myFeatureEventBus from '@/shared/features/MyFeature/my-feature-event-bus';

myFeatureEventBus.emit('my-event', { message: 'hello' });
```
