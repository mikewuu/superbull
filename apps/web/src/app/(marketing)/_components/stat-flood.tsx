const stats = [
  { value: '9', label: 'framework adapters, one import away' },
  { value: '8', label: 'MCP tools your agent can call' },
  { value: '1', label: 'command to run the proxy, no code changes' },
  { value: '0', label: 'seat limits — it is MIT licensed' },
];

export function StatFlood(): React.ReactElement {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border-subtle px-4 sm:px-6 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-bg-default p-6 sm:p-8">
          <div className="font-mono text-5xl font-semibold tracking-tight text-content-emphasis sm:text-6xl">
            {stat.value}
          </div>
          <div className="mt-2 text-2sm text-content-subtle">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
