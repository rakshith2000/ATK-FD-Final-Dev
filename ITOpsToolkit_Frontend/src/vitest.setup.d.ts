/// <reference types="vitest" />
import '@testing-library/jest-dom';

declare module 'vitest' {
    /* eslint-disable @typescript-eslint/no-explicit-any*/
    /* eslint-disable @typescript-eslint/no-empty-object-type*/
    interface Assertion<T = any> extends jest.Matchers<T> {}
}
