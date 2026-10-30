/// <reference types="vite/client" />

declare module '*.svg?react' {
    import type * as React from 'react';
    const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    export default ReactComponent;
}

declare module '*.md?raw' {
    const content: string;
    export default content;
}
