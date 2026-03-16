import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolvePath } from "../utils/pathResolver.js";
import { InvalidInputError, OperationFailedError } from "./hash.js";

const parseJsonToCsvArgs = (args) => {
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

    throw new InvalidInputError("Unknown json-to-csv argument");
  }

  if (!parsed.input || !parsed.output) {
    throw new InvalidInputError("Missing required json-to-csv argument");
  }

  return parsed;
};

const readJsonTextFromStream = async (inputPath) => {
  const stream = createReadStream(inputPath, { encoding: "utf8" });
  let content = "";

  for await (const chunk of stream) {
    content += chunk;
  }

  return content;
};

const escapeCsvCell = (value) => {
  const normalized = String(value ?? "");
  const escapedQuotes = normalized.replace(/"/g, "\"\"");

  if (/[",\n\r]/.test(escapedQuotes)) {
    return `"${escapedQuotes}"`;
  }

  return escapedQuotes;
};

const convertRecordsToCsv = (records) => {
  if (records.length === 0) {
    return "";
  }

  const firstRecord = records[0];
  if (!firstRecord || typeof firstRecord !== "object" || Array.isArray(firstRecord)) {
    throw new OperationFailedError("Input must be an array of objects");
  }

  const headers = Object.keys(firstRecord);
  const headerLine = headers.map(escapeCsvCell).join(",");
  const rowLines = records.map((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new OperationFailedError("Input must be an array of objects");
    }

    return headers.map((header) => escapeCsvCell(record[header])).join(",");
  });

  return `${headerLine}\n${rowLines.join("\n")}\n`;
};

export const executeJsonToCsvCommand = async (cwd, args) => {
  const { input, output } = parseJsonToCsvArgs(args);
  const inputPath = resolvePath(cwd, input);
  const outputPath = resolvePath(cwd, output);

  let rawJson;
  try {
    rawJson = await readJsonTextFromStream(inputPath);
  } catch {
    throw new OperationFailedError("Failed to read json input");
  }

  let records;
  try {
    records = JSON.parse(rawJson);
  } catch {
    throw new OperationFailedError("Invalid JSON input");
  }

  if (!Array.isArray(records)) {
    throw new OperationFailedError("Input must be a JSON array");
  }

  const csvContent = convertRecordsToCsv(records);

  try {
    await pipeline(Readable.from([csvContent]), createWriteStream(outputPath));
  } catch {
    throw new OperationFailedError("Failed to write csv output");
  }
};
