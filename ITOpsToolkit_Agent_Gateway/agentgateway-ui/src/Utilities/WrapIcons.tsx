import React from 'react';

export function wrapIcon<T>(Icon: T): React.FC<
  React.HTMLAttributes<HTMLElement> & { size?: string | number }
> {
  return Icon as unknown as React.FC<
    React.HTMLAttributes<HTMLElement> & { size?: string | number }
  >;
}
