import { FC } from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ className }) => {
  return (
    <div 
      className={clsx(
        'bg-gray-200 animate-pulse rounded',
        className
      )}
    />
  );
};