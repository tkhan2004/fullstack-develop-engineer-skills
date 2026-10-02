export interface Context {
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
  /** Directory commands operate on unless `--cwd` is given. */
  readonly cwd: string;
  /** Whether output may contain ANSI colour (TTY and NO_COLOR unset). */
  readonly color: boolean;
  /** Overrides where architectures/presets/skills are read from (tests). */
  readonly dataDir?: string;
}

export const VERSION = "0.0.0";
export const GENERATOR = `@engineering-skills/cli@${VERSION}`;
