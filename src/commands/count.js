import { createReadStream } from "node:fs";
import { resolvePath } from "../utils/pathResolver.js";
import { InvalidInputError, OperationFailedError } from "./hash.js";

const WHITESPACE_REGEX = /\s/;

const parseCountArgs = (args) => {
  const parsed = {
    input: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--input") {
      const input = args[index + 1];
      if (!input || input.startsWith("--")) {
        throw new InvalidInputError("Missing required --input value");
      }
      parsed.input = input;
      index += 1;
      continue;
    }

    throw new InvalidInputError("Unknown count argument");
  }

  if (!parsed.input) {
    throw new InvalidInputError("Missing required --input argument");
  }

  return parsed;
};

const getFileStats = (filePath) => {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: "utf8" });
    let lines = 0;
    let words = 0;
    let characters = 0;
    let inWord = false;

    stream.on("data", (chunk) => {
      characters += chunk.length;

      for (const char of chunk) {
        if (char === "\n") {
          lines += 1;
        }

        if (WHITESPACE_REGEX.test(char)) {
          inWord = false;
          continue;
        }

        if (!inWord) {
          words += 1;
          inWord = true;
        }
      }
    });

    stream.on("end", () => resolve({ lines, words, characters }));
    stream.on("error", reject);
  });
};

export const executeCountCommand = async (cwd, args) => {
  const { input } = parseCountArgs(args);
  const inputPath = resolvePath(cwd, input);

  let stats;
  try {
    stats = await getFileStats(inputPath);
  } catch {
    throw new OperationFailedError("Failed to read input file");
  }

  console.log(`Lines: ${stats.lines}`);
  console.log(`Words: ${stats.words}`);
  console.log(`Characters: ${stats.characters}`);
};