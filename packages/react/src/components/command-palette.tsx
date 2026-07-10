import { Command } from 'cmdk';
import { LayoutGrid, ListRestart, Pause, Play, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { usePauseQueue } from '../hooks/use-pause-queue';
import { useQueues } from '../hooks/use-queues';
import { useResumeQueue } from '../hooks/use-resume-queue';
import { useRetryQueueJobs } from '../hooks/use-retry-queue-jobs';
import { AddJobDialog } from '../pages/queue-detail/_components/add-job-dialog';

export function CommandPalette() {
  const [showing, setShowing] = useState(false);
  const [showingAddJob, setShowingAddJob] = useState(false);
  const navigate = useNavigate();
  const { queueName } = useParams();
  const { data: queues } = useQueues({});
  const pauseQueue = usePauseQueue();
  const resumeQueue = useResumeQueue();
  const retryQueueJobs = useRetryQueueJobs();
  const currentQueue = queues?.find((candidate) => candidate.name === queueName);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowing((current) => !current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runAndClose = (action: () => void) => {
    setShowing(false);
    action();
  };

  return (
    <>
      <Command.Dialog
        open={showing}
        onOpenChange={setShowing}
        label="Command palette"
        overlayClassName="fixed inset-0 z-50 animate-fade-in bg-black/20"
        contentClassName="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 animate-scale-in-fade overflow-hidden rounded-lg border border-border-subtle bg-bg-default shadow-lg"
      >
        <Command.Input
          placeholder="Jump to a queue or run an action…"
          className="w-full border-b border-border-subtle px-4 py-3 text-sm text-content-emphasis outline-none placeholder:text-content-muted"
        />
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-sm text-content-muted">
            No results.
          </Command.Empty>

          <Command.Group
            heading="Navigate"
            className="px-1.5 py-1 text-[11px] font-medium tracking-wide text-content-muted [&_[cmdk-group-items]]:mt-1"
          >
            <Command.Item
              value="Overview"
              onSelect={() => runAndClose(() => navigate('/'))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-content-default aria-selected:bg-bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              <LayoutGrid className="size-4 text-content-muted" />
              Overview
            </Command.Item>
            {queues?.map((queue) => (
              <Command.Item
                key={queue.name}
                value={`Go to ${queue.name}`}
                onSelect={() =>
                  runAndClose(() => navigate(`/queue/${encodeURIComponent(queue.name)}`))
                }
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-content-default aria-selected:bg-bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              >
                <span className="size-1.5 rounded-full bg-content-muted" />
                Go to {queue.name}
              </Command.Item>
            ))}
          </Command.Group>

          {currentQueue && (
            <Command.Group
              heading="This queue"
              className="px-1.5 py-1 text-[11px] font-medium tracking-wide text-content-muted [&_[cmdk-group-items]]:mt-1"
            >
              <Command.Item
                value={currentQueue.is_paused ? 'Resume queue' : 'Pause queue'}
                onSelect={() =>
                  runAndClose(() => {
                    if (currentQueue.is_paused) {
                      resumeQueue.mutate(currentQueue.name);
                      return;
                    }
                    pauseQueue.mutate(currentQueue.name);
                  })
                }
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-content-default aria-selected:bg-bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              >
                {currentQueue.is_paused ? (
                  <Play className="size-4 text-content-muted" />
                ) : (
                  <Pause className="size-4 text-content-muted" />
                )}
                {currentQueue.is_paused ? 'Resume queue' : 'Pause queue'}
              </Command.Item>
              <Command.Item
                value="Add job"
                onSelect={() => runAndClose(() => setShowingAddJob(true))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-content-default aria-selected:bg-bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              >
                <Plus className="size-4 text-content-muted" />
                Add job
              </Command.Item>
              {currentQueue.allow_retries && (
                <Command.Item
                  value="Retry all failed"
                  disabled={(currentQueue.counts.failed ?? 0) === 0}
                  onSelect={() =>
                    runAndClose(() =>
                      retryQueueJobs.mutate({ queueName: currentQueue.name, status: 'failed' }),
                    )
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-content-default aria-selected:bg-bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                >
                  <ListRestart className="size-4 text-content-muted" />
                  Retry all failed
                </Command.Item>
              )}
            </Command.Group>
          )}
        </Command.List>
      </Command.Dialog>

      {currentQueue && (
        <AddJobDialog
          queueName={currentQueue.name}
          showing={showingAddJob}
          onClose={() => setShowingAddJob(false)}
        />
      )}
    </>
  );
}
