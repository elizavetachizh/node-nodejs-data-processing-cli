import { homedir } from "node:os";
import process from "node:process";
import { createInterface } from "node:readline";

const WELCOME_MESSAGE = "Welcome to Data Processing CLI!";
const GOODBYE_MESSAGE = "Thank you for using Data Processing CLI!";

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

rl.on("line", (line) => {
  if (line.trim() === ".exit") {
    shutdown();
    return;
  }

  rl.prompt();
});

rl.on("SIGINT", shutdown);
// process.on("SIGINT", shutdown);