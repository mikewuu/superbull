import { Button } from '@bullwatch/ui';
import { Pause, Play, Trash2 } from 'lucide-react';
import { useEmptyQueue } from '../../../hooks/use-empty-queue';
import { usePauseQueue } from '../../../hooks/use-pause-queue';
import { useResumeQueue } from '../../../hooks/use-resume-queue';
import type { AppQueue } from '../../../lib/api-types';

interface QueueControlsProps {
  queue: AppQueue;
}

export function QueueControls(props: QueueControlsProps) {
  const { queue } = props;
  const pauseQueue = usePauseQueue();
  const resumeQueue = useResumeQueue();
  const emptyQueue = useEmptyQueue();

  return (
    <div className="flex items-center gap-2">
      {queue.is_paused ? (
        <Button
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          icon={<Play className="size-3.5" />}
          text="Resume"
          loading={resumeQueue.isPending}
          onClick={() => resumeQueue.mutate(queue.name)}
        />
      ) : (
        <Button
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          icon={<Pause className="size-3.5" />}
          text="Pause"
          loading={pauseQueue.isPending}
          onClick={() => pauseQueue.mutate(queue.name)}
        />
      )}
      <Button
        variant="danger-outline"
        className="h-8 px-2.5 text-xs"
        icon={<Trash2 className="size-3.5" />}
        text="Empty"
        loading={emptyQueue.isPending}
        onClick={() => emptyQueue.mutate(queue.name)}
      />
    </div>
  );
}
