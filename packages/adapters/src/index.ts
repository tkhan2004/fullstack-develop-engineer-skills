import type { AiAdapter } from "./adapter.js";
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { genericAdapter } from "./generic.js";

export { renderAdapter } from "./adapter.js";
export type { AdapterOptions, AiAdapter, GeneratedFile, OutputMode } from "./adapter.js";
export { claudeAdapter, claudeSkillName } from "./claude.js";
export { codexAdapter } from "./codex.js";
export { genericAdapter } from "./generic.js";
export {
  findManagedBlock,
  inspectGeneratedFile,
  normalize,
  renderGeneratedFile,
  sha256,
  upsertManagedBlock,
} from "./files.js";
export type {
  BlockStatus,
  FoundBlock,
  GeneratedFileState,
  HeaderMeta,
  UpsertResult,
} from "./files.js";
export {
  ARCHITECTURE_AWARENESS,
  STRICTNESS_LEAD,
  renderContext,
  renderInline,
  renderSection,
} from "./markdown.js";

/** Registry. Adding an adapter means adding it here; the core never learns about it. */
export const ADAPTERS: Readonly<Record<string, AiAdapter>> = {
  claude: claudeAdapter,
  codex: codexAdapter,
  generic: genericAdapter,
};

export const getAdapter = (id: string): AiAdapter | undefined => ADAPTERS[id];
