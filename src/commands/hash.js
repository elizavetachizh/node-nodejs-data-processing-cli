import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolvePath } from "../utils/pathResolver.js";

const SUPPORTED_ALGORITHMS = ["sha256", "md5", "sha512"];

export class InvalidInputError extends Error {}
export class OperationFailedError extends Error {}

const parseHashArgs = (args) => {
  const parsed = {
    input: null,
    algorithm: "sha256",
    save: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--save") {
      parsed.save = true;
      continue;
    }

    if (token === "--input") {
      const input = args[index + 1];
      if (!input || input.startsWith("--")) {
        throw new InvalidInputError("Missing required --input value");
      }
      parsed.input = input;
      index += 1;
      continue;
    }

    if (token === "--algorithm") {
      const algorithm = args[index + 1];
      if (!algorithm || algorithm.startsWith("--")) {
        throw new InvalidInputError("Missing --algorithm value");
      }
      parsed.algorithm = algorithm;
      index += 1;
      continue;
    }

    throw new InvalidInputError("Unknown hash argument");
  }

  if (!parsed.input) {
    throw new InvalidInputError("Missing required --input argument");
  }

  return parsed;
};

const calculateFileHash = (filePath, algorithm) => {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    const readStream = createReadStream(filePath);

    readStream.on("data", (chunk) => {
      hash.update(chunk);
    });

    readStream.on("error", reject);
    readStream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
};

const saveHashToFile = async (filePath, algorithm, digest) => {
  const targetPath = `${filePath}.${algorithm}`;
  const content = `${algorithm}: ${digest}\n`;
  await pipeline(Readable.from([content]), createWriteStream(targetPath));
};

export const executeHashCommand = async (cwd, args) => {
  const { input, algorithm, save } = parseHashArgs(args);

  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    throw new OperationFailedError("Unsupported algorithm");
  }

  const inputPath = resolvePath(cwd, input);
  let digest;

  try {
    digest = await calculateFileHash(inputPath, algorithm);
  } catch {
    throw new OperationFailedError("Failed to calculate hash");
  }

  console.log(`${algorithm}: ${digest}`);

  if (save) {
    try {
      await saveHashToFile(inputPath, algorithm, digest);
    } catch {
      throw new OperationFailedError("Failed to save hash");
    }
  }
};