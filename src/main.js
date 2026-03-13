import { homedir } from "node:os";
import process from "node:process";
import { createInterface } from "node:readline";
import {
  changeDirectory,
  listCurrentDirectory,
  moveUpDirectory,
} from "./navigation.js";

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

const parseCommandLine = (line) => {
  const trimmedLine = line.trim();
  const rawTokens = trimmedLine.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const tokens = rawTokens.map((token) => token.replace(/^"(.*)"$/, "$1"));

  return {
    command: tokens[0] ?? "",
    args: tokens.slice(1),
  };
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

  console.log(INVALID_INPUT_MESSAGE);
  rl.prompt();
});

rl.on("SIGINT", shutdown);
process.on("SIGINT", shutdown);