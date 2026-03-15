import { homedir } from "node:os";
import process from "node:process";
import { createInterface } from "node:readline";
import { startRepl } from "./repl.js";

const WELCOME_MESSAGE = "Welcome to Data Processing CLI!";
const GOODBYE_MESSAGE = "Thank you for using Data Processing CLI!";
const state = {
  currentWorkingDirectory: homedir(),
};

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

const printCurrentDirectory = () => {
  console.log(`You are currently in ${state.currentWorkingDirectory}`);
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

startRepl({
  rl,
  state,
  printCurrentDirectory,
  shutdown,
});

rl.on("SIGINT", shutdown);
process.on("SIGINT", shutdown);