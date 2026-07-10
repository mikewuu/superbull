const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hourTickLabels = [0, 6, 12, 18];

interface HeatmapGridProps {
  matrix: number[][];
  timezone: 'UTC';
}

export function HeatmapGrid(props: HeatmapGridProps) {
  const { matrix, timezone } = props;
  const maxCount = Math.max(...matrix.flat(), 1);

  return (
    <div className="candy-card flex flex-col gap-3 rounded-lg px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-2sm font-medium text-content-emphasis">Activity by hour</span>
        <span className="text-xs text-content-muted">Hours in {timezone}</span>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col justify-between gap-[3px] pt-px">
          {weekdayLabels.map((label) => (
            <span key={label} className="h-3.5 text-[10px] leading-[14px] text-content-muted">
              {label}
            </span>
          ))}
        </div>
        <div className="flex-1">
          <div className="flex flex-col gap-[3px]">
            {matrix.map((row, weekdayIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: weekday rows are a fixed 0-6 index
              <div key={weekdayIndex} className="flex gap-[3px]">
                {row.map((count, hour) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: hour cells are a fixed 0-23 index
                    key={hour}
                    title={`${weekdayLabels[weekdayIndex]} ${hour}:00 — ${count} job${count === 1 ? '' : 's'}`}
                    className="h-3.5 flex-1 rounded-[2px] border border-border-muted"
                    style={{
                      backgroundColor:
                        count === 0 ? undefined : `rgb(37 99 235 / ${count / maxCount})`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between">
            {hourTickLabels.map((hour) => (
              <span key={hour} className="text-[10px] text-content-muted">
                {hour}:00
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
