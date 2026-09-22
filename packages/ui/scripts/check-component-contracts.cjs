const { readdirSync, readFileSync, statSync } = require("node:fs");
const { relative, resolve } = require("node:path");

const root = resolve(__dirname, "..", "src");

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "__tests__" ? [] : filesIn(path);
    }
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const checks = [
  {
    pattern: /\$\{\s*className\s*\}/g,
    message: "compose caller className with cn(), not template interpolation",
  },
  {
    pattern: /className\??\s*:\s*(?:any|unknown)\b/g,
    message: "className must be typed as string",
  },
  {
    pattern: /ref\??\s*:\s*any\b/g,
    message: "forward a typed React ref instead of exposing ref?: any",
  },
  {
    pattern: /\bcontainerClass\??\s*:/g,
    message: "use the explicit containerClassName convention",
  },
];

const failures = [];
for (const file of filesIn(root)) {
  const source = readFileSync(file, "utf8");
  for (const check of checks) {
    for (const match of source.matchAll(check.pattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      failures.push(`${relative(resolve(root, ".."), file)}:${line} — ${check.message}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Shared component contract violations:\n");
  console.error(failures.map((failure) => `  ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Shared component contracts valid: typed refs/classes and deterministic class merging.");
