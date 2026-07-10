export function DocsTable(props: { headers: string[]; rows: string[][] }) {
  const { headers, rows } = props;
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full min-w-max text-left text-[13px]">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted text-content-subtle">
            {headers.map((header) => (
              <th key={header} className="px-4 py-2.5 font-medium whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, cellIndex) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: row cells have no stable id
                  key={cellIndex}
                  className="px-4 py-2.5 align-top font-mono text-[12.5px] text-content-default first:text-content-emphasis"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
