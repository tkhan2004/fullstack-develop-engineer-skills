import * as clack from "@clack/prompts";
import { Cancelled, type Option, type Prompter } from "../application/prompter.js";

const checked = <T>(value: T | symbol): T => {
  if (clack.isCancel(value)) throw new Cancelled();
  return value as T;
};

const toClack = <T extends string>(options: readonly Option<T>[]) =>
  options.map((o) => ({ value: o.value, label: o.label, ...(o.hint ? { hint: o.hint } : {}) }));

async function select<T extends string>(q: {
  readonly message: string;
  readonly options: readonly Option<T>[];
  readonly initial?: T;
}): Promise<T> {
  const options = { message: q.message, options: toClack(q.options) as never };
  return checked<T>(
    await clack.select<T>(
      q.initial === undefined ? options : { ...options, initialValue: q.initial },
    ),
  );
}

async function multiselect<T extends string>(q: {
  readonly message: string;
  readonly options: readonly Option<T>[];
  readonly initial: readonly T[];
}): Promise<T[]> {
  return checked<T[]>(
    await clack.multiselect<T>({
      message: q.message,
      options: toClack(q.options) as never,
      initialValues: [...q.initial],
      required: false,
    }),
  );
}

/** Terminal prompts via @clack/prompts. Only used when stdin and stdout are a TTY. */
export const clackPrompter: Prompter = {
  select,
  multiselect,
  async confirm(q) {
    return checked<boolean>(
      await clack.confirm({ message: q.message, initialValue: q.initial ?? true }),
    );
  },
  async text(q) {
    return checked<string>(
      await clack.text({
        message: q.message,
        ...(q.initial !== undefined ? { initialValue: q.initial } : {}),
        ...(q.placeholder !== undefined ? { placeholder: q.placeholder } : {}),
      }),
    );
  },
};
