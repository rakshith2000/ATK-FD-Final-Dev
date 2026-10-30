import type { HTMLAttributes, ReactElement } from 'react';
import { Children, createContext, forwardRef, isValidElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@/shadcn/lib/utils';

// Types
type StepperOrientation = 'horizontal' | 'vertical';
type StepState = 'active' | 'completed' | 'inactive' | 'loading';
type StepIndicators = {
    active?: React.ReactNode;
    completed?: React.ReactNode;
    inactive?: React.ReactNode;
    loading?: React.ReactNode;
};

interface StepperContextValue {
    activeStep: number; // Live active step (completedTillStep + 1)
    selectedStep: number; // User selected tab step
    setSelectedStep: (step: number) => void;
    completedTillStep: number;
    stepsCount: number;
    orientation: StepperOrientation;
    registerTrigger: (node: HTMLButtonElement | null) => void;
    triggerNodes: HTMLButtonElement[];
    focusNext: (currentIdx: number) => void;
    focusPrev: (currentIdx: number) => void;
    focusFirst: () => void;
    focusLast: () => void;
    indicators: StepIndicators;
}

interface StepItemContextValue {
    step: number;
    state: StepState;
    isSelected: boolean;
    isDisabled: boolean;
    isLoading: boolean;
}

const StepperContext = createContext<StepperContextValue | undefined>(undefined);
const StepItemContext = createContext<StepItemContextValue | undefined>(undefined);

function useStepper() {
    const ctx = useContext(StepperContext);
    if (!ctx) throw new Error('useStepper must be used within a Stepper');
    return ctx;
}

function useStepItem() {
    const ctx = useContext(StepItemContext);
    if (!ctx) throw new Error('useStepItem must be used within a StepperItem');
    return ctx;
}

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
    completedTillStep: number;
    value?: number;
    defaultValue?: number;
    onValueChange?: (value: number) => void;
    orientation?: StepperOrientation;
    indicators?: StepIndicators;
}

function Stepper({ completedTillStep, value, defaultValue, onValueChange, orientation = 'horizontal', className, children, indicators = {}, ...props }: StepperProps) {
    const liveActiveStep = completedTillStep + 1;
    const [selectedStepState, setSelectedStepState] = useState(defaultValue ?? liveActiveStep);
    const [triggerNodes, setTriggerNodes] = useState<HTMLButtonElement[]>([]);

    useEffect(() => {
        if (value === undefined && defaultValue === undefined) {
            setSelectedStepState(liveActiveStep);
        }
    }, [completedTillStep, value, defaultValue, liveActiveStep]);

    const registerTrigger = useCallback((node: HTMLButtonElement | null) => {
        setTriggerNodes((prev) => {
            if (node && !prev.includes(node)) {
                return [...prev, node];
            } else if (!node && prev.includes(node!)) {
                return prev.filter((n) => n !== node);
            } else {
                return prev;
            }
        });
    }, []);

    const handleSetSelectedStep = useCallback(
        (step: number) => {
            if (value === undefined) {
                setSelectedStepState(step);
            }
            onValueChange?.(step);
        },
        [value, onValueChange],
    );

    const currentSelectedStep = value ?? selectedStepState;

    const focusTrigger = (idx: number) => {
        if (triggerNodes[idx]) triggerNodes[idx].focus();
    };
    const focusNext = (currentIdx: number) => focusTrigger((currentIdx + 1) % triggerNodes.length);
    const focusPrev = (currentIdx: number) => focusTrigger((currentIdx - 1 + triggerNodes.length) % triggerNodes.length);
    const focusFirst = () => focusTrigger(0);
    const focusLast = () => focusTrigger(triggerNodes.length - 1);

    const contextValue = useMemo<StepperContextValue>(
        () => ({
            activeStep: liveActiveStep,
            selectedStep: currentSelectedStep,
            setSelectedStep: handleSetSelectedStep,
            completedTillStep,
            stepsCount: Children.toArray(children).filter(
                (child): child is ReactElement => isValidElement(child) && (child.type as { displayName?: string }).displayName === 'StepperItem',
            ).length,
            orientation,
            registerTrigger,
            focusNext,
            focusPrev,
            focusFirst,
            focusLast,
            triggerNodes,
            indicators,
        }),
        [liveActiveStep, currentSelectedStep, completedTillStep, handleSetSelectedStep, children, orientation, registerTrigger, triggerNodes, indicators],
    );

    return (
        <StepperContext.Provider value={contextValue}>
            <div role="tablist" aria-orientation={orientation} data-slot="stepper" className={cn('w-full', className)} data-orientation={orientation} {...props}>
                {children}
            </div>
        </StepperContext.Provider>
    );
}

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
    step: number;
    completed: boolean;
    disabled?: boolean;
    loading?: boolean;
}

const StepperItem = forwardRef<HTMLDivElement, StepperItemProps>(({ step, completed, disabled = false, loading = false, className, children, ...props }, ref) => {
    const { activeStep, selectedStep } = useStepper();

    const isSelected = step === selectedStep;
    const state: StepState = completed ? 'completed' : step === activeStep ? 'active' : 'inactive';
    const isLoading = loading && (step === activeStep || isSelected);

    return (
        <StepItemContext.Provider value={{ step, state, isSelected, isDisabled: disabled, isLoading }}>
            <div
                ref={ref}
                data-slot="stepper-item"
                className={cn(
                    'max-w-md',
                    'group/step flex items-center justify-center not-last:flex-1 group-data-[orientation=horizontal]/stepper-nav:flex-row group-data-[orientation=vertical]/stepper-nav:flex-col',
                    className,
                )}
                data-state={state}
                data-selected={isSelected}
                {...(isLoading ? { 'data-loading': true } : {})}
                {...props}
            >
                {children}
            </div>
        </StepItemContext.Provider>
    );
});
StepperItem.displayName = 'StepperItem';

type StepperTriggerProps = useRender.ComponentProps<'button'>;

function StepperTrigger({ className, children, tabIndex, render, ...props }: StepperTriggerProps) {
    const { state, isSelected, isLoading, step, isDisabled } = useStepItem();
    const stepperCtx = useStepper();
    const { setSelectedStep, registerTrigger, triggerNodes, focusNext, focusPrev, focusFirst, focusLast } = stepperCtx;
    const id = `stepper-tab-${step}`;
    const panelId = `stepper-panel-${step}`;

    const btnRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (btnRef.current) {
            registerTrigger(btnRef.current);
        }
    }, [btnRef.current]);

    const myIdx = useMemo(() => triggerNodes.findIndex((n: HTMLButtonElement) => n === btnRef.current), [triggerNodes, btnRef.current]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                if (myIdx !== -1 && focusNext) focusNext(myIdx);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                if (myIdx !== -1 && focusPrev) focusPrev(myIdx);
                break;
            case 'Home':
                e.preventDefault();
                if (focusFirst) focusFirst();
                break;
            case 'End':
                e.preventDefault();
                if (focusLast) focusLast();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (!isDisabled) setSelectedStep(step);
                break;
        }
    };

    const defaultProps = {
        role: 'tab',
        id,
        'aria-selected': isSelected,
        'aria-controls': panelId,
        tabIndex: typeof tabIndex === 'number' ? tabIndex : isSelected ? 0 : -1,
        'data-slot': 'stepper-trigger',
        'data-state': state,
        'data-selected': isSelected,
        'data-loading': isLoading,
        className: cn(
            'focus-visible:border-ring focus-visible:ring-ring/50 inline-flex cursor-pointer items-center outline-none focus-visible:z-10 focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-60 transition-all',
            'gap-2.5 rounded-full',
            className,
        ),
        onClick: () => {
            if (!isDisabled) {
                setSelectedStep(step);
            }
        },
        onKeyDown: handleKeyDown,
        disabled: isDisabled,
        children,
    };

    return useRender({
        defaultTagName: 'button',
        render,
        ref: btnRef,
        props: mergeProps<'button'>(defaultProps, props),
    });
}

function StepperIndicator({ children, className }: React.ComponentProps<'div'>) {
    const { state, isSelected, isLoading } = useStepItem();
    const { indicators } = useStepper();

    return (
        <div
            data-slot="stepper-indicator"
            data-state={state}
            data-selected={isSelected}
            className={cn(
                'btn-split relative z-10 flex size-6 shrink-0 items-center justify-center overflow-hidden transition-all duration-200',
                'rounded-full text-xs',
                className,
                state === 'completed'
                    ? 'split-blue-light ring-blue-500/40'
                    : state === 'active'
                      ? 'scale-105 bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
                      : 'split-slate ring-slate-500/40',
                isSelected ? 'scale-115 ring-2 -translate-y-0.5 -translate-x-0.5' : '',
            )}
        >
            <span className="flex justify-center items-center">
                {indicators &&
                ((isLoading && indicators.loading) ||
                    (state === 'completed' && indicators.completed) ||
                    (state === 'active' && indicators.active) ||
                    (state === 'inactive' && indicators.inactive))
                    ? (isLoading && indicators.loading) ||
                      (state === 'completed' && indicators.completed) ||
                      (state === 'active' && indicators.active) ||
                      (state === 'inactive' && indicators.inactive)
                    : children}
            </span>
        </div>
    );
}

function StepperSeparator({ className }: React.ComponentProps<'div'>) {
    const { state } = useStepItem();

    return (
        <div
            data-slot="stepper-separator"
            data-state={state}
            className={cn(
                'rounded-sm m-0.5 z-0 group-data-[orientation=horizontal]/stepper-nav:h-0.5 group-data-[orientation=horizontal]/stepper-nav:flex-1 group-data-[orientation=vertical]/stepper-nav:h-12 group-data-[orientation=vertical]/stepper-nav:w-0.5',
                className,
                state === 'completed' ? 'bg-blue-400' : '',
                state === 'active' ? 'bg-slate-200' : '',
                state === 'inactive' ? 'bg-slate-200' : '',
            )}
        />
    );
}

function StepperTitle({ children, className }: React.ComponentProps<'h3'>) {
    const { state, isSelected } = useStepItem();

    return (
        <h3
            data-slot="stepper-title"
            data-state={state}
            data-selected={isSelected}
            className={cn('text-sm leading-none font-medium transition-colors', isSelected ? 'font-bold text-indigo-600' : '', className)}
        >
            {children}
        </h3>
    );
}

function StepperDescription({ children, className }: React.ComponentProps<'div'>) {
    const { state } = useStepItem();

    return (
        <div data-slot="stepper-description" data-state={state} className={cn('text-muted-foreground text-sm', className)}>
            {children}
        </div>
    );
}

function StepperNav({ children, className }: React.ComponentProps<'nav'>) {
    const { activeStep, selectedStep, orientation } = useStepper();

    return (
        <nav
            data-slot="stepper-nav"
            data-state={activeStep}
            data-selected={selectedStep}
            data-orientation={orientation}
            className={cn(
                'group/stepper-nav inline-flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col',
                className,
            )}
        >
            {children}
        </nav>
    );
}

function StepperPanel({ children, className }: React.ComponentProps<'div'>) {
    const { selectedStep } = useStepper();

    return (
        <div data-slot="stepper-panel" data-state={selectedStep} className={cn('w-full', className)}>
            {children}
        </div>
    );
}

interface StepperContentProps extends React.ComponentProps<'div'> {
    value: number;
    forceMount?: boolean;
}

function StepperContent({ value, forceMount, children, className }: StepperContentProps) {
    const { selectedStep } = useStepper();
    const isSelected = value === selectedStep;

    if (!forceMount && !isSelected) {
        return null;
    }

    return (
        <div
            data-slot="stepper-content"
            data-state={selectedStep}
            className={cn('w-full animate-[fadeIn_0.3s_ease-in-out]', className, !isSelected && forceMount && 'hidden')}
            hidden={!isSelected && forceMount}
        >
            {children}
        </div>
    );
}

export {
    useStepper,
    useStepItem,
    Stepper,
    StepperItem,
    StepperTrigger,
    StepperIndicator,
    StepperSeparator,
    StepperTitle,
    StepperDescription,
    StepperPanel,
    StepperContent,
    StepperNav,
    type StepperProps,
    type StepperItemProps,
    type StepperTriggerProps,
    type StepperContentProps,
};
