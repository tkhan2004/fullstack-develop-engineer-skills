import { posix } from "node:path";

export type ResolvedImport =
  | { readonly kind: "internal"; readonly path: string }
  | { readonly kind: "external"; readonly pkg: string }
  | { readonly kind: "unresolved"; readonly specifier: string };

export interface ResolveContext {
  /** Project files, POSIX paths relative to the project root. */
  readonly files: ReadonlySet<string>;
  /** Path aliases: prefix → replacement, e.g. `{ "@/": "src/" }`. */
  readonly aliases?: Readonly<Record<string, string>>;
}

const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"] as const;
/** TypeScript projects import `./x.js` for `./x.ts`. */
const JS_TO_TS: Record<string, readonly string[]> = {
  ".js": [".ts", ".tsx"],
  ".jsx": [".tsx"],
  ".mjs": [".mts"],
  ".cjs": [".cts"],
};

export function packageName(specifier: string): string {
  const bare = specifier.startsWith("node:") ? specifier.slice("node:".length) : specifier;
  const parts = bare.split("/");
  return bare.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] as string);
}

function candidates(base: string): string[] {
  const list = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ];
  const ext = posix.extname(base);
  for (const replacement of JS_TO_TS[ext] ?? [])
    list.push(base.slice(0, -ext.length) + replacement);
  return list;
}

export function resolveImport(
  from: string,
  specifier: string,
  context: ResolveContext,
): ResolvedImport {
  let base: string | undefined;

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = posix.normalize(posix.join(posix.dirname(from), specifier));
  } else {
    const alias = Object.keys(context.aliases ?? {})
      .filter((prefix) => specifier.startsWith(prefix))
      .sort((a, b) => b.length - a.length)[0];
    if (alias !== undefined)
      base = posix.normalize(
        (context.aliases as Record<string, string>)[alias] + specifier.slice(alias.length),
      );
  }

  if (base === undefined) return { kind: "external", pkg: packageName(specifier) };
  const hit = candidates(base).find((candidate) => context.files.has(candidate));
  return hit === undefined ? { kind: "unresolved", specifier } : { kind: "internal", path: hit };
}
