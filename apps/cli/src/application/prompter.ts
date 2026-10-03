/** The questions `init` can ask. Production uses a terminal UI; tests script the answers. */

export interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

export interface Prompter {
  select<T extends string>(question: {
    readonly id: string;
    readonly message: string;
    readonly options: readonly Option<T>[];
    readonly initial?: T;
  }): Promise<T>;

  multiselect<T extends string>(question: {
    readonly id: string;
    readonly message: string;
    readonly options: readonly Option<T>[];
    readonly initial: readonly T[];
  }): Promise<T[]>;

  confirm(question: {
    readonly id: string;
    readonly message: string;
    readonly initial?: boolean;
  }): Promise<boolean>;

  text(question: {
    readonly id: string;
    readonly message: string;
    readonly initial?: string;
    readonly placeholder?: string;
  }): Promise<string>;
}

/** The user pressed Ctrl-C (or otherwise abandoned a prompt). Nothing has been written. */
export class Cancelled extends Error {
  constructor() {
    super("Cancelled");
    this.name = "Cancelled";
  }
}
