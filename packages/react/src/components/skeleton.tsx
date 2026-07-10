import { cn } from '../lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton(props: SkeletonProps) {
  const { className } = props;

  return <div className={cn('animate-pulse rounded-lg bg-bg-subtle', className)} />;
}
