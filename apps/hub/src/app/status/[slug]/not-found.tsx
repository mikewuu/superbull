export default function StatusPageNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <img src="/logo-mark.webp" alt="" className="h-10 w-auto" />
      <div>
        <h1 className="text-lg font-semibold text-content-emphasis">
          No status page at this address.
        </h1>
        <p className="mt-1 text-sm text-content-subtle">Check the link and try again.</p>
      </div>
    </div>
  );
}
