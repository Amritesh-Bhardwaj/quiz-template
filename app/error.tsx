"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="mx-auto max-w-lg p-6">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <pre className="mt-3 whitespace-pre-wrap text-sm text-red-600">{error?.message || "Unknown error"}</pre>
        <button onClick={() => reset()} className="mt-4 rounded bg-black px-4 py-2 text-white">
          Try again
        </button>
      </body>
    </html>
  )
}
