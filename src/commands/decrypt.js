import { createDecipheriv, scrypt } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { resolvePath } from "../utils/pathResolver.js";
import { InvalidInputError, OperationFailedError } from "./hash.js";

const scryptAsync = promisify(scrypt);

const SALT_SIZE = 16;
const IV_SIZE = 12;
const AUTH_TAG_SIZE = 16;
const HEADER_SIZE = SALT_SIZE + IV_SIZE;
const MIN_ENCRYPTED_SIZE = HEADER_SIZE + AUTH_TAG_SIZE;

const parseDecryptArgs = (args) => {
  const parsed = {
    input: null,
    output: null,
    password: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--input") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new InvalidInputError("Missing required --input value");
      }
      parsed.input = value;
      index += 1;
      continue;
    }

    if (token === "--output") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new InvalidInputError("Missing required --output value");
      }
      parsed.output = value;
      index += 1;
      continue;
    }

    if (token === "--password") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new InvalidInputError("Missing required --password value");
      }
      parsed.password = value;
      index += 1;
      continue;
    }

    throw new InvalidInputError("Unknown decrypt argument");
  }

  if (!parsed.input || !parsed.output || !parsed.password) {
    throw new InvalidInputError("Missing required decrypt argument");
  }

  return parsed;
};

const readBinarySegment = async (fileHandle, position, length) => {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await fileHandle.read(buffer, 0, length, position);
  if (bytesRead !== length) {
    throw new OperationFailedError("Unable to read encrypted file segment");
  }
  return buffer;
};

const readEncryptedMetadata = async (inputPath) => {
  const fileStats = await stat(inputPath);
  if (fileStats.size < MIN_ENCRYPTED_SIZE) {
    throw new OperationFailedError("Encrypted file is too small");
  }

  const fileHandle = await open(inputPath, "r");
  try {
    const header = await readBinarySegment(fileHandle, 0, HEADER_SIZE);
    const authTag = await readBinarySegment(
      fileHandle,
      fileStats.size - AUTH_TAG_SIZE,
      AUTH_TAG_SIZE,
    );

    return {
      salt: header.subarray(0, SALT_SIZE),
      iv: header.subarray(SALT_SIZE, HEADER_SIZE),
      authTag,
      encryptedSize: fileStats.size,
    };
  } finally {
    await fileHandle.close();
  }
};

const decryptFile = async ({ inputPath, outputPath, key, iv, authTag, encryptedSize }) => {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const cipherTextStart = HEADER_SIZE;
  const cipherTextEnd = encryptedSize - AUTH_TAG_SIZE - 1;

  const cipherTextStream =
    cipherTextEnd >= cipherTextStart
      ? createReadStream(inputPath, { start: cipherTextStart, end: cipherTextEnd })
      : Readable.from([]);

  await pipeline(cipherTextStream, decipher, createWriteStream(outputPath));
};

export const executeDecryptCommand = async (cwd, args) => {
  const { input, output, password } = parseDecryptArgs(args);
  const inputPath = resolvePath(cwd, input);
  const outputPath = resolvePath(cwd, output);

  let metadata;
  try {
    metadata = await readEncryptedMetadata(inputPath);
  } catch {
    throw new OperationFailedError("Failed to read encrypted input file");
  }

  let key;
  try {
    key = await scryptAsync(password, metadata.salt, 32);
  } catch {
    throw new OperationFailedError("Failed to derive key");
  }

  try {
    await decryptFile({
      inputPath,
      outputPath,
      key,
      iv: metadata.iv,
      authTag: metadata.authTag,
      encryptedSize: metadata.encryptedSize,
    });
  } catch {
    try {
      await unlink(outputPath);
    } catch {
      // Ignore cleanup failures.
    }
    throw new OperationFailedError("Failed to decrypt file");
  }
};
