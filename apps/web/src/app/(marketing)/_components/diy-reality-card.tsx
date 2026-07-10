export function DiyRealityCard(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-muted">
      <div className="flex items-center gap-1.5 border-b border-border-subtle px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
        <span className="ml-2 rounded-md bg-bg-default px-2.5 py-0.5 text-2sm text-content-subtle ring-1 ring-border-subtle">
          shell
        </span>
      </div>
      <div className="p-5 font-mono text-[12.5px] leading-relaxed sm:p-6">
        <p className="text-content-muted line-through">$ redis-cli KEYS bull:*</p>
        <p className="mt-1 text-xs text-content-subtle italic">Don&apos;t. It scans every key.</p>

        <p className="mt-4 text-content-subtle">$ node</p>
        <p className="text-content-default">&gt; await queue.getJobs([&apos;failed&apos;], 0, 9)</p>
        <p className="mt-2 text-content-muted">
          [ Job {'{'} id: &apos;4821&apos;, data: [Object] {'}'}, ... 46 more ]
        </p>
        <p className="mt-1 text-xs text-content-subtle italic">
          47 jobs. No names you can read. No retry button.
        </p>
      </div>
    </div>
  );
}
