import { createCipheriv, randomBytes, scrypt } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { promisify } from "node:util";
import { resolvePath } from "../utils/pathResolver.js";
import { InvalidInputError, OperationFailedError } from "./hash.js";

const scryptAsync = promisify(scrypt);

const parseEncryptArgs = (args) => {
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

    throw new InvalidInputError("Unknown encrypt argument");
  }

  if (!parsed.input || !parsed.output || !parsed.password) {
    throw new InvalidInputError("Missing required encrypt argument");
  }

  return parsed;
};

const encryptFile = async ({ inputPath, outputPath, key, salt, iv }) => {
  await new Promise((resolve, reject) => {
    const inputStream = createReadStream(inputPath);
    const outputStream = createWriteStream(outputPath);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    let isSettled = false;

    const rejectOnce = (error) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      inputStream.destroy();
      cipher.destroy();
      outputStream.destroy();
      reject(error);
    };

    const startPiping = () => {
      inputStream.pipe(cipher);
      cipher.pipe(outputStream, { end: false });
    };

    const writeHeader = () => {
      if (!outputStream.write(salt)) {
        outputStream.once("drain", writeIv);
        return;
      }
      writeIv();
    };

    const writeIv = () => {
      if (!outputStream.write(iv)) {
        outputStream.once("drain", startPiping);
        return;
      }
      startPiping();
    };

    inputStream.on("error", rejectOnce);
    cipher.on("error", rejectOnce);
    outputStream.on("error", rejectOnce);

    cipher.on("end", () => {
      let authTag;
      try {
        authTag = cipher.getAuthTag();
      } catch (error) {
        rejectOnce(error);
        return;
      }

      if (!outputStream.write(authTag)) {
        outputStream.once("drain", () => outputStream.end());
        return;
      }
      outputStream.end();
    });

    outputStream.on("finish", () => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      resolve();
    });

    writeHeader();
  });
};

export const executeEncryptCommand = async (cwd, args) => {
  const { input, output, password } = parseEncryptArgs(args);
  const inputPath = resolvePath(cwd, input);
  const outputPath = resolvePath(cwd, output);
  const salt = randomBytes(16);
  const iv = randomBytes(12);

  let key;
  try {
    key = await scryptAsync(password, salt, 32);
  } catch {
    throw new OperationFailedError("Failed to derive key");
  }

  try {
    await encryptFile({ inputPath, outputPath, key, salt, iv });
  } catch {
    throw new OperationFailedError("Failed to encrypt file");
  }
};
