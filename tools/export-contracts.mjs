import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const toolchainBin = resolve(
  process.env.RUSTUP_HOME ?? resolve(process.env.HOME ?? root, ".rustup"),
  "toolchains/stable-x86_64-unknown-linux-gnu/bin",
);
const cargo = process.env.CARGO_BIN ?? resolve(toolchainBin, "cargo");
const outputDirectory = resolve(root, "openapi");
const builds = [
  ["no-features", ["--no-default-features"]],
  ["basic", ["--no-default-features", "--features", "basic"]],
  ["advanced", ["--no-default-features", "--features", "advanced"]],
  ["all-features", ["--all-features"]],
];

await mkdir(outputDirectory, { recursive: true });

for (const [name, features] of builds) {
  const output = await runCargo(features);
  await writeFile(resolve(outputDirectory, `${name}.yaml`), output, "utf8");
  console.log(`exported ${name}`);
}

function runCargo(features) {
  return new Promise((resolveOutput, reject) => {
    const command = [cargo, "run", "--quiet", "--bin", "export_openapi", ...features]
      .map((argument) => `'${argument.replaceAll("'", "'\\''")}'`)
      .join(" ");
    const child = spawn("/usr/bin/bash", ["-lc", command], {
      cwd: root,
      env: { ...process.env, PATH: `${toolchainBin}:${process.env.PATH ?? ""}` },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolveOutput(stdout);
      } else {
        reject(new Error(`cargo export failed (${code}): ${stderr}${stdout}`));
      }
    });
  });
}
