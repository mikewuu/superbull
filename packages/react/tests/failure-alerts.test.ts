import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addFailureAlert,
  dismissFailureAlert,
  getFailureAlerts,
  getIncreasedFailureCounts,
  subscribeFailureAlerts,
} from '../src/lib/failure-alerts';

beforeEach(() => {
  for (const alert of getFailureAlerts()) {
    dismissFailureAlert(alert.id);
  }
});

describe('failure-alerts store', () => {
  it('adds an alert and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFailureAlerts(listener);

    addFailureAlert('send-emails', 3);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getFailureAlerts()).toEqual([
      expect.objectContaining({ queueName: 'send-emails', deltaCount: 3 }),
    ]);
    unsubscribe();
  });

  it('dismisses an alert by id', () => {
    addFailureAlert('send-emails', 3);
    const [alert] = getFailureAlerts();
    expect(alert).toBeDefined();

    dismissFailureAlert(alert?.id ?? '');

    expect(getFailureAlerts()).toEqual([]);
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFailureAlerts(listener);
    unsubscribe();

    addFailureAlert('send-emails', 1);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('getIncreasedFailureCounts', () => {
  it('reports queues whose failed count increased', () => {
    const increases = getIncreasedFailureCounts({ 'send-emails': 4, 'process-videos': 2 }, [
      { name: 'send-emails', counts: { failed: 7 } },
      { name: 'process-videos', counts: { failed: 2 } },
    ]);
    expect(increases).toEqual([{ queueName: 'send-emails', deltaCount: 3 }]);
  });

  it('ignores queues with no previous count on record', () => {
    const increases = getIncreasedFailureCounts({}, [
      { name: 'sync-contacts', counts: { failed: 4 } },
    ]);
    expect(increases).toEqual([]);
  });

  it('ignores queues whose failed count did not increase', () => {
    const increases = getIncreasedFailureCounts({ 'send-emails': 6 }, [
      { name: 'send-emails', counts: { failed: 6 } },
    ]);
    expect(increases).toEqual([]);
  });
});
