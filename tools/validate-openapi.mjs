import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS from "openapi-typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const names = ["no-features", "basic", "advanced", "all-features"];

for (const name of names) {
  const spec = await readFile(resolve(root, "openapi", `${name}.yaml`), "utf8");
  await openapiTS(spec);
  console.log(`validated ${name}`);
}
