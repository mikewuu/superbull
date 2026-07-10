import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/button';
import type { AppQueue, JobStatus, QueueStatus } from '../../../lib/api-types';

interface QueuePaginationProps {
  queue: AppQueue;
  status: QueueStatus;
  page: number;
  onChange: (page: number) => void;
}

export function QueuePagination(props: QueuePaginationProps) {
  const { queue, status, page, onChange } = props;
  const { pagination } = queue;

  if (queue.jobs.length === 0 && page <= 1) {
    return null;
  }

  const shownStart = pagination.range.start + 1;
  const shownEnd = pagination.range.start + queue.jobs.length;
  const total = status === 'latest' ? null : (queue.counts[status as JobStatus] ?? null);

  return (
    <div className="flex items-center justify-between text-2sm text-content-subtle">
      <span>
        Viewing {shownStart.toLocaleString()}–{shownEnd.toLocaleString()}
        {total !== null && ` of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          icon={<ChevronLeft className="size-3.5" />}
          text="Previous"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        />
        <Button
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          text="Next"
          icon={<ChevronRight className="size-3.5" />}
          disabled={page >= pagination.page_count}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </div>
  );
}
