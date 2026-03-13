import { homedir } from "node:os";
import process from "node:process";
import { createInterface } from "node:readline";
import {
  changeDirectory,
  listCurrentDirectory,
  moveUpDirectory,
} from "./navigation.js";
import {
  executeHashCommand,
  InvalidInputError,
  OperationFailedError,
} from "./commands/hash.js";
import { executeHashCompareCommand } from "./commands/hashCompare.js";
import { executeCountCommand } from "./commands/count.js";
import { parseCommandLine } from "./utils/argParser.js";

const WELCOME_MESSAGE = "Welcome to Data Processing CLI!";
const GOODBYE_MESSAGE = "Thank you for using Data Processing CLI!";
const INVALID_INPUT_MESSAGE = "Invalid input";
const OPERATION_FAILED_MESSAGE = "Operation failed";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

process.chdir(homedir());

const printCurrentDirectory = () => {
  console.log(`You are currently in ${process.cwd()}`);
};

let isShuttingDown = false;

const shutdown = () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(GOODBYE_MESSAGE);
  rl.close();
  process.exit(0);
};

console.log(WELCOME_MESSAGE);
printCurrentDirectory();
rl.prompt();

rl.on("line", async (line) => {
  const { command, args } = parseCommandLine(line);

  if (command === ".exit") {
    shutdown();
    return;
  }

  if (command === "ls" && args.length === 0) {
    try {
      await listCurrentDirectory(process.cwd());
      printCurrentDirectory();
    } catch {
      console.log(OPERATION_FAILED_MESSAGE);
    }

    rl.prompt();
    return;
  }

  if (command === "up" && args.length === 0) {
    try {
      moveUpDirectory(process.cwd());
      printCurrentDirectory();
    } catch {
      console.log(OPERATION_FAILED_MESSAGE);
    }

    rl.prompt();
    return;
  }

  if (command === "cd") {
    if (args.length !== 1) {
      console.log(INVALID_INPUT_MESSAGE);
      rl.prompt();
      return;
    }

    try {
      await changeDirectory(process.cwd(), args[0]);
      printCurrentDirectory();
    } catch {
      console.log(OPERATION_FAILED_MESSAGE);
    }

    rl.prompt();
    return;
  }

  if (command === "hash") {
    try {
      await executeHashCommand(process.cwd(), args);
      printCurrentDirectory();
    } catch (error) {
      if (error instanceof InvalidInputError) {
        console.log(INVALID_INPUT_MESSAGE);
      } else if (error instanceof OperationFailedError) {
        console.log(OPERATION_FAILED_MESSAGE);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
    }

    rl.prompt();
    return;
  }

  if (command === "hash-compare") {
    try {
      await executeHashCompareCommand(process.cwd(), args);
      printCurrentDirectory();
    } catch (error) {
      if (error instanceof InvalidInputError) {
        console.log(INVALID_INPUT_MESSAGE);
      } else if (error instanceof OperationFailedError) {
        console.log(OPERATION_FAILED_MESSAGE);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
    }

    rl.prompt();
    return;
  }

  if (command === "count") {
    try {
      await executeCountCommand(process.cwd(), args);
      printCurrentDirectory();
    } catch (error) {
      if (error instanceof InvalidInputError) {
        console.log(INVALID_INPUT_MESSAGE);
      } else if (error instanceof OperationFailedError) {
        console.log(OPERATION_FAILED_MESSAGE);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
    }

    rl.prompt();
    return;
  }

  console.log(INVALID_INPUT_MESSAGE);
  rl.prompt();
});

rl.on("SIGINT", shutdown);
process.on("SIGINT", shutdown);