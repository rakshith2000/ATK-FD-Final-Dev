import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockAppEnvConfig = vi.hoisted(() => ({ isInDevelopmentMode: true }));

vi.mock('@/config/app-env-config', () => ({
    appEnvConfig: mockAppEnvConfig,
}));

import { ErrorCauseRenderer } from '../ErrorCauseRenderer';

function errorWithCause(message: string, cause: unknown): Error {
    return new Error(message, { cause });
}

describe('ErrorCauseRenderer', () => {
    // Render gate

    test('renders nothing when error is null', () => {
        const { container } = render(<ErrorCauseRenderer error={null} />);
        expect(container.innerHTML).toBe('');
    });

    test('renders nothing when error is undefined', () => {
        const { container } = render(<ErrorCauseRenderer error={undefined} />);
        expect(container.innerHTML).toBe('');
    });

    test('renders nothing in production mode', () => {
        mockAppEnvConfig.isInDevelopmentMode = false;
        const err = errorWithCause('fail', { detail: 'err' });
        const { container } = render(<ErrorCauseRenderer error={err} />);
        expect(container.innerHTML).toBe('');
        mockAppEnvConfig.isInDevelopmentMode = true;
    });

    // Section headers

    test('renders Message section for error with message', () => {
        const err = new Error('Something broke');
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getAllByText('Message').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/"Something broke"/)).toBeInTheDocument();
    });

    test('renders Name section when error name is not "Error"', () => {
        const err = new TypeError('bad type');
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getAllByText('Name').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/"TypeError"/)).toBeInTheDocument();
    });

    test('does not render Name section for plain Error', () => {
        const err = new Error('plain');
        const { container } = render(<ErrorCauseRenderer error={err} />);
        const headers = container.querySelectorAll('.uppercase');
        const headerTexts = Array.from(headers).map((el) => el.textContent);
        expect(headerTexts).not.toContain('Name');
    });

    test('renders Cause section when error has cause', () => {
        const err = errorWithCause('fail', { networkCode: 500 });
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getAllByText('Cause').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('networkCode:')).toBeInTheDocument();
        expect(screen.getByText('500')).toBeInTheDocument();
    });

    test('renders Stack section', () => {
        const err = new Error('with stack');
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getAllByText('Stack').length).toBeGreaterThanOrEqual(1);
    });

    // Cause value rendering

    test('renders string cause with quotes', () => {
        const err = errorWithCause('fail', 'test error');
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText(/"test error"/)).toBeInTheDocument();
    });

    test('renders number cause', () => {
        const err = errorWithCause('fail', 42);
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    test('renders boolean cause', () => {
        const err = errorWithCause('fail', true);
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText('true')).toBeInTheDocument();
    });

    test('renders null value as italic "null"', () => {
        const err = errorWithCause('fail', { field: null });
        render(<ErrorCauseRenderer error={err} />);
        const nullEl = screen.getByText('null');
        expect(nullEl).toBeInTheDocument();
        expect(nullEl.classList.contains('italic')).toBe(true);
    });

    // Object cause

    test('renders object keys and values in cause', () => {
        const err = errorWithCause('fail', { networkCode: 500, detail: 'Server error' });
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText('networkCode:')).toBeInTheDocument();
        expect(screen.getByText('500')).toBeInTheDocument();
        expect(screen.getByText('detail:')).toBeInTheDocument();
        expect(screen.getByText(/"Server error"/)).toBeInTheDocument();
    });

    test('renders object cause with braces', () => {
        const err = errorWithCause('fail', { a: 1 });
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText('{')).toBeInTheDocument();
        expect(screen.getByText('}')).toBeInTheDocument();
    });

    // Array cause

    test('renders array cause with brackets', () => {
        const err = errorWithCause('fail', [1, 2, 3]);
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText('[')).toBeInTheDocument();
        expect(screen.getByText(']')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Nested structures

    test('renders nested object in cause', () => {
        const err = errorWithCause('fail', { outer: { inner: 'deep' } });
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText('outer:')).toBeInTheDocument();
        expect(screen.getByText('inner:')).toBeInTheDocument();
        expect(screen.getByText(/"deep"/)).toBeInTheDocument();
    });

    // Chained errors

    test('renders Error as cause with its message', () => {
        const cause = new Error('root cause');
        const err = errorWithCause('wrapper', cause);
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText('message:')).toBeInTheDocument();
    });

    // Axios error cause shape

    test('renders full axios error cause shape', () => {
        const cause = {
            networkCode: 403,
            apiErrorResponse: { detail: 'Forbidden' },
        };
        const err = errorWithCause('Request failed', cause);
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText('networkCode:')).toBeInTheDocument();
        expect(screen.getByText('403')).toBeInTheDocument();
        expect(screen.getByText('apiErrorResponse:')).toBeInTheDocument();
        expect(screen.getByText(/"Forbidden"/)).toBeInTheDocument();
    });

    // Functions in cause

    test('renders function as [Function: name] string', () => {
        function myHandler() {}
        const err = errorWithCause('fail', { callback: myHandler });
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText(/".*Function: myHandler.*"/)).toBeInTheDocument();
    });

    // Circular references

    test('renders circular reference safely', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        const err = errorWithCause('fail', obj);
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText(/".*Circular.*"/)).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Stack rendering

    test('renders stack trace in a pre element', () => {
        const err = new Error('stack test');
        const { container } = render(<ErrorCauseRenderer error={err} />);
        const pre = container.querySelector('pre');
        expect(pre).not.toBeNull();
        expect(pre!.textContent).toContain('Error: stack test');
    });

    // Multiple sections rendered together

    test('renders message, cause, and stack together', () => {
        const err = errorWithCause('main error', { networkCode: 422 });
        render(<ErrorCauseRenderer error={err} />);
        expect(screen.getByText(/"main error"/)).toBeInTheDocument();
        expect(screen.getByText('networkCode:')).toBeInTheDocument();
        expect(screen.getByText('422')).toBeInTheDocument();
        const { container } = render(<ErrorCauseRenderer error={err} />);
        expect(container.querySelector('pre')).not.toBeNull();
    });
});
