import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/button';
import type { Pagination } from '../../../lib/api-types';

interface QueuePaginationProps {
  pagination: Pagination;
  page: number;
  onChange: (page: number) => void;
}

export function QueuePagination(props: QueuePaginationProps) {
  const { pagination, page, onChange } = props;
  const { start, end } = pagination.range;

  return (
    <div className="flex items-center justify-between text-sm text-content-subtle">
      <span>
        Viewing {start + 1}–{end + 1}
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
          icon={<ChevronRight className="size-3.5" />}
          text="Next"
          disabled={page >= pagination.page_count}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </div>
  );
}
