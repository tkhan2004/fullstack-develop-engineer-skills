// The surrounding code returns a Result and never throws; see getUser.
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export declare function getUser(id: string): Result<{ id: string }>;

// New code returns the same shape as its neighbours, so callers handle it the way they already do.
export function getInvoice(id: string): Result<{ id: string; total: number }> {
  if (id === "") return { ok: false, error: "id is required" };
  return { ok: true, value: { id, total: 0 } };
}
