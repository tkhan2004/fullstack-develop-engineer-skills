import { Cancelled, type Option, type Prompter } from "../application/prompter.js";

type Answer = string | string[] | boolean | "CANCEL";

/**
 * A prompter that answers from a script keyed by question id. An unscripted question throws, so a
 * test fails loudly when the flow asks something it should not; `asked` records what was asked.
 */
export class ScriptedPrompter implements Prompter {
  readonly asked: string[] = [];
  readonly options = new Map<string, readonly Option<string>[]>();
  readonly initials = new Map<string, unknown>();

  /** `onAsk` runs when a question is asked, before it is answered: lets a test observe the world at that moment. */
  constructor(
    private readonly script: Readonly<Record<string, Answer>>,
    private readonly onAsk?: (id: string) => void | Promise<void>,
  ) {}

  private async answer(id: string): Promise<Answer> {
    this.asked.push(id);
    await this.onAsk?.(id);
    if (!(id in this.script))
      throw new Error(`Unscripted question: "${id}" (asked so far: ${this.asked.join(", ")})`);
    const value = this.script[id] as Answer;
    if (value === "CANCEL") throw new Cancelled();
    return value;
  }

  async select<T extends string>(q: {
    id: string;
    options: readonly Option<T>[];
    initial?: T;
  }): Promise<T> {
    this.options.set(q.id, q.options);
    this.initials.set(q.id, q.initial);
    const value = (await this.answer(q.id)) as string;
    if (!q.options.some((o) => o.value === value))
      throw new Error(`"${value}" is not an option of "${q.id}"`);
    return value as T;
  }

  async multiselect<T extends string>(q: {
    id: string;
    options: readonly Option<T>[];
    initial: readonly T[];
  }): Promise<T[]> {
    this.options.set(q.id, q.options);
    this.initials.set(q.id, q.initial);
    return (await this.answer(q.id)) as T[];
  }

  async confirm(q: { id: string; initial?: boolean }): Promise<boolean> {
    this.initials.set(q.id, q.initial);
    return (await this.answer(q.id)) as boolean;
  }

  async text(q: { id: string; initial?: string }): Promise<string> {
    this.initials.set(q.id, q.initial);
    return (await this.answer(q.id)) as string;
  }
}
