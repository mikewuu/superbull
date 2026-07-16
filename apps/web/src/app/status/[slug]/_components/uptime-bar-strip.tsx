import { getUptimeBarColor } from '../../../../lib/status-pages/get-uptime-bar-color';
import type { UptimeDay } from '../../../../lib/status-pages/types';

interface UptimeBarStripProps {
  days: UptimeDay[];
}

export function UptimeBarStrip(props: UptimeBarStripProps) {
  const { days } = props;

  return (
    <div className="flex h-8 items-end gap-px">
      {days.map((day) => (
        <div
          key={day.date}
          title={`${day.date}: ${day.rate === null ? 'no data' : `${(day.rate * 100).toFixed(1)}% (${day.total} jobs)`}`}
          className={`h-full flex-1 rounded-sm ${getBarColorClass(day.rate)}`}
        />
      ))}
    </div>
  );
}

function getBarColorClass(rate: number | null): string {
  const color = getUptimeBarColor(rate);
  if (color === 'green') {
    return 'bg-content-success';
  }
  if (color === 'amber') {
    return 'bg-content-warning';
  }
  if (color === 'red') {
    return 'bg-content-error';
  }
  return 'bg-bg-emphasis';
}
