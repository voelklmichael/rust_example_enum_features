import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(new URL("..", import.meta.url).pathname);
const generated = async (name) =>
  readFile(resolve(root, "typescript", "generated", `${name}.ts`), "utf8");

const contracts = Object.fromEntries(
  await Promise.all(
    ["no-features", "basic", "advanced", "all-features"].map(async (name) => [
      name,
      await generated(name),
    ]),
  ),
);

const contains = (name, variant) =>
  contracts[name].includes(`type: "${variant}"`);

for (const baseVariant of ["Created", "Deleted"]) {
  for (const name of Object.keys(contracts)) {
    if (!contains(name, baseVariant)) {
      throw new Error(`${name} is missing base variant ${baseVariant}`);
    }
  }
}

if (contains("no-features", "Archived") || contains("no-features", "Restored")) {
  throw new Error("no-features contains a gated variant");
}
if (!contains("basic", "Archived") || contains("basic", "Restored")) {
  throw new Error("basic contract has an unexpected variant set");
}
if (contains("advanced", "Archived") || !contains("advanced", "Restored")) {
  throw new Error("advanced contract has an unexpected variant set");
}
if (!contains("all-features", "Archived") || !contains("all-features", "Restored")) {
  throw new Error("all-features is missing a gated variant");
}

console.log("contract matrix is consistent");
