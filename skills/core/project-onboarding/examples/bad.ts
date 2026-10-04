// The surrounding code returns a Result and never throws; see getUser.
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export declare function getUser(id: string): Result<{ id: string }>;

// New code invents its own error style: every caller now needs try/catch for this one function.
export function getInvoice(id: string): { id: string; total: number } {
  if (id === "") throw new Error("id is required");
  return { id, total: 0 };
}
