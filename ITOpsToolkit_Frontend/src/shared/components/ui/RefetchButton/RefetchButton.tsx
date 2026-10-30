import { Tooltip } from '@mui/material';
import type React from 'react';
import { TbReload } from 'react-icons/tb';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

interface RefetchButtonProps {
    toolTip?: string;
    className?: ClassNameValue;
    onRefetch: () => void;
    isRefetching: boolean;
    iconSize?: number;
    children?: React.ReactNode;
}

const RefetchButton: React.FC<RefetchButtonProps> = ({ children, isRefetching, onRefetch, className, toolTip = 'Reload', iconSize }) => {
    const onBtnClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();
        onRefetch();
    };

    return (
        <Tooltip arrow placement="bottom" title={toolTip}>
            <span className="flex">
                <button type="button" className={twMerge('cursor-pointer', className)} disabled={isRefetching} onClick={onBtnClick}>
                    <span className="flex flex-row gap-1.5 justify-center items-center">
                        <span>
                            <TbReload className={isRefetching ? 'animate-spin' : ''} size={iconSize} />
                        </span>
                        <span>{children}</span>
                    </span>
                </button>
            </span>
        </Tooltip>
    );
};

export default RefetchButton;
