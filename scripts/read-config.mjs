import { readFile } from "node:fs/promises";
import { parse } from "jsonc-parser";
/** Parse Wrangler JSONC without eval; reject malformed configuration before mutation. */
export async function readConfig(path) {
  const errors = [];
  const value = parse(await readFile(path, "utf8"), errors, {
    allowTrailingComma: true,
  });
  if (
    errors.length ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  )
    throw new Error(
      "Configuração Wrangler inválida. Nenhuma operação autorizada.",
    );
  return value;
}
