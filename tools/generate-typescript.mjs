import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const builds = [
  ["no-features", ""],
  ["basic", "--features basic"],
  ["advanced", "--features advanced"],
  ["all-features", "--all-features"],
];

const requestedBuild = process.argv[2];
const selectedBuilds = requestedBuild
  ? builds.filter(([name]) => name === requestedBuild)
  : builds;

if (selectedBuilds.length === 0) {
  throw new Error(`Unknown build '${requestedBuild}'`);
}

for (const [name, flags] of selectedBuilds) {
  const specPath = resolve(root, "openapi", `${name}.yaml`);
  const outputPath = resolve(root, "typescript", "generated", `${name}.ts`);
  const spec = await readFile(specPath, "utf8");
  const output = astToString(await openapiTS(spec));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${output}
`, "utf8");
  console.log(`generated ${name}${flags ? ` (${flags})` : ""}`);
}
