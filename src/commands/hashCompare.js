import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { resolvePath } from "../utils/pathResolver.js";
import { InvalidInputError, OperationFailedError } from "./hash.js";

const SUPPORTED_ALGORITHMS = ["sha256", "md5", "sha512"];

const parseHashCompareArgs = (args) => {
  const parsed = {
    input: null,
    hashFile: null,
    algorithm: "sha256",
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

    if (token === "--hash") {
      const hashFile = args[index + 1];
      if (!hashFile || hashFile.startsWith("--")) {
        throw new InvalidInputError("Missing required --hash value");
      }
      parsed.hashFile = hashFile;
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

    throw new InvalidInputError("Unknown hash-compare argument");
  }

  if (!parsed.input || !parsed.hashFile) {
    throw new InvalidInputError("Missing required hash-compare argument");
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

const readHashFileWithStream = (filePath) => {
  return new Promise((resolve, reject) => {
    let content = "";
    const readStream = createReadStream(filePath, { encoding: "utf8" });

    readStream.on("data", (chunk) => {
      content += chunk;
    });

    readStream.on("error", reject);
    readStream.on("end", () => {
      resolve(content);
    });
  });
};

const normalizeExpectedHash = (rawContent) => {
  const trimmed = rawContent.trim();
  const [, valueAfterPrefix] = trimmed.split(":");

  if (valueAfterPrefix !== undefined) {
    return valueAfterPrefix.trim().toLowerCase();
  }

  return trimmed.toLowerCase();
};

export const executeHashCompareCommand = async (cwd, args) => {
  const { input, hashFile, algorithm } = parseHashCompareArgs(args);

  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    throw new OperationFailedError("Unsupported algorithm");
  }

  const inputPath = resolvePath(cwd, input);
  const hashPath = resolvePath(cwd, hashFile);

  let actualHash;
  let expectedHashRaw;

  try {
    actualHash = await calculateFileHash(inputPath, algorithm);
    expectedHashRaw = await readHashFileWithStream(hashPath);
  } catch {
    throw new OperationFailedError("Failed to read input/hash file");
  }

  const expectedHash = normalizeExpectedHash(expectedHashRaw);
  const isMatch = actualHash.toLowerCase() === expectedHash;

  console.log(isMatch ? "OK" : "MISMATCH");
};
