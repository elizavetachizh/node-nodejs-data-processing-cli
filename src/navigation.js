import { readdir } from "node:fs/promises";
import { stat } from "node:fs/promises";
import process from "node:process";
import { resolveParentDirectory, resolvePath } from "./utils/pathResolver.js";

const COLLATOR = new Intl.Collator("en", { sensitivity: "base" });

export const listCurrentDirectory = async (cwd) => {
  const entries = await readdir(cwd, { withFileTypes: true });

  const normalizedEntries = entries.map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? "folder" : "file",
    isDirectory: entry.isDirectory(),
  }));

  normalizedEntries.sort((left, right) => {
    if (left.isDirectory !== right.isDirectory) {
      return left.isDirectory ? -1 : 1;
    }

    return COLLATOR.compare(left.name, right.name);
  });

  for (const entry of normalizedEntries) {
    console.log(`${entry.name} [${entry.type}]`);
  }
};

export const moveUpDirectory = (cwd) => {
  const nextDirectory = resolveParentDirectory(cwd);
  process.chdir(nextDirectory);
};

export const changeDirectory = async (cwd, targetPath) => {
  const resolvedPath = resolvePath(cwd, targetPath);
  const targetStats = await stat(resolvedPath);

  if (!targetStats.isDirectory()) {
    throw new Error("Target is not a directory");
  }

  process.chdir(resolvedPath);
};
