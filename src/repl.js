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
import { executeEncryptCommand } from "./commands/encrypt.js";
import { executeDecryptCommand } from "./commands/decrypt.js";
import { executeCsvToJsonCommand } from "./commands/csv-to-json.js";
import { executeJsonToCsvCommand } from "./commands/json-to-csv.js";
import { parseCommandLine } from "./utils/argParser.js";

const INVALID_INPUT_MESSAGE = "Invalid input";
const OPERATION_FAILED_MESSAGE = "Operation failed";

const printError = (error) => {
  if (error instanceof InvalidInputError) {
    console.log(INVALID_INPUT_MESSAGE);
    return;
  }

  if (error instanceof OperationFailedError) {
    console.log(OPERATION_FAILED_MESSAGE);
    return;
  }

  console.log(OPERATION_FAILED_MESSAGE);
};

export const startRepl = ({ rl, state, printCurrentDirectory, shutdown }) => {
  rl.on("line", async (line) => {
    const { command, args } = parseCommandLine(line);

    if (command === ".exit") {
      shutdown();
      return;
    }

    if (command === "ls") {
      if (args.length !== 0) {
        console.log(INVALID_INPUT_MESSAGE);
        rl.prompt();
        return;
      }

      try {
        await listCurrentDirectory(state.currentWorkingDirectory);
        printCurrentDirectory();
      } catch {
        console.log(OPERATION_FAILED_MESSAGE);
      }

      rl.prompt();
      return;
    }

    if (command === "up") {
      if (args.length !== 0) {
        console.log(INVALID_INPUT_MESSAGE);
        rl.prompt();
        return;
      }

      try {
        state.currentWorkingDirectory = moveUpDirectory(state.currentWorkingDirectory);
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
        state.currentWorkingDirectory = await changeDirectory(state.currentWorkingDirectory, args[0]);
        printCurrentDirectory();
      } catch {
        console.log(OPERATION_FAILED_MESSAGE);
      }

      rl.prompt();
      return;
    }

    if (command === "hash") {
      try {
        await executeHashCommand(state.currentWorkingDirectory, args);
        printCurrentDirectory();
      } catch (error) {
        printError(error);
      }

      rl.prompt();
      return;
    }

    if (command === "hash-compare") {
      try {
        await executeHashCompareCommand(state.currentWorkingDirectory, args);
        printCurrentDirectory();
      } catch (error) {
        printError(error);
      }

      rl.prompt();
      return;
    }

    if (command === "count") {
      try {
        await executeCountCommand(state.currentWorkingDirectory, args);
        printCurrentDirectory();
      } catch (error) {
        printError(error);
      }

      rl.prompt();
      return;
    }

    if (command === "encrypt") {
      try {
        await executeEncryptCommand(state.currentWorkingDirectory, args);
        printCurrentDirectory();
      } catch (error) {
        printError(error);
      }

      rl.prompt();
      return;
    }

    if (command === "decrypt") {
      try {
        await executeDecryptCommand(state.currentWorkingDirectory, args);
        printCurrentDirectory();
      } catch (error) {
        printError(error);
      }

      rl.prompt();
      return;
    }

    if (command === "csv-to-json") {
      try {
        await executeCsvToJsonCommand(state.currentWorkingDirectory, args);
        printCurrentDirectory();
      } catch (error) {
        printError(error);
      }

      rl.prompt();
      return;
    }

    if (command === "json-to-csv") {
      try {
        await executeJsonToCsvCommand(state.currentWorkingDirectory, args);
        printCurrentDirectory();
      } catch (error) {
        printError(error);
      }

      rl.prompt();
      return;
    }

    console.log(INVALID_INPUT_MESSAGE);
    rl.prompt();
  });
};
