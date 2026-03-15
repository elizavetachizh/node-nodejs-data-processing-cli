import { createReadStream, createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolvePath } from "../utils/pathResolver.js";
import { InvalidInputError, OperationFailedError } from "./hash.js";

const parseCsvToJsonArgs = (args) => {
  const parsed = {
    input: null,
    output: null,
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

    throw new InvalidInputError("Unknown csv-to-json argument");
  }

  if (!parsed.input || !parsed.output) {
    throw new InvalidInputError("Missing required csv-to-json argument");
  }

  return parsed;
};

const createCsvToJsonTransform = () => {
  let buffer = "";
  let headers = null;
  let isFirstObject = true;
  let hasWrittenArrayStart = false;

  const processLine = function (line) {
    if (!line.trim()) {
      return;
    }

    if (!headers) {
      headers = line.split(",").map((header) => header.trim());
      if (!hasWrittenArrayStart) {
        this.push("[\n");
        hasWrittenArrayStart = true;
      }
      return;
    }

    const values = line.split(",").map((value) => value.trim());
    const record = {};

    for (let index = 0; index < headers.length; index += 1) {
      record[headers[index]] = values[index] ?? "";
    }

    const jsonLine = `  ${JSON.stringify(record)}`;
    if (isFirstObject) {
      this.push(`${jsonLine}\n`);
      isFirstObject = false;
    } else {
      this.push(`,${jsonLine}\n`);
    }
  };

  return new Transform({
    readableObjectMode: false,
    writableObjectMode: false,
    transform(chunk, _encoding, callback) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine.call(this, line);
      }

      callback();
    },
    flush(callback) {
      if (buffer.length > 0) {
        processLine.call(this, buffer);
      }

      if (!hasWrittenArrayStart) {
        this.push("[\n");
      }
      this.push("]\n");
      callback();
    },
  });
};

export const executeCsvToJsonCommand = async (cwd, args) => {
  const { input, output } = parseCsvToJsonArgs(args);
  const inputPath = resolvePath(cwd, input);
  const outputPath = resolvePath(cwd, output);

  try {
    await pipeline(
      createReadStream(inputPath),
      createCsvToJsonTransform(),
      createWriteStream(outputPath),
    );
  } catch {
    throw new OperationFailedError("Failed to convert csv to json");
  }
};
