import { ErrorBoundary } from 'react-error-boundary';
import ErrorBoundaryFallback, { type ErrorBoundaryFallbackProps } from '../../ui/ErrorBoundaryFallback/ErrorBoundaryFallback';

interface WithErrorBoundaryOptions extends Omit<ErrorBoundaryFallbackProps, 'error' | 'reset'> {
    onReset?: () => void;
}

const withErrorBoundary = <P extends object>(WrappedComponent: React.ComponentType<P>, options: WithErrorBoundaryOptions = {}) => {
    const { onReset, ...fallbackProps } = options;

    const WithErrorBoundary: React.FC<P> = (props) => (
        <ErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
                <ErrorBoundaryFallback
                    {...fallbackProps}
                    error={error as Error}
                    description={JSON.stringify(error)}
                    reset={() => {
                        onReset?.();
                        resetErrorBoundary();
                    }}
                />
            )}
        >
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );

    WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'})`;

    return WithErrorBoundary;
};

export default withErrorBoundary;
