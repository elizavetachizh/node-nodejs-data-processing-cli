import { dirname, isAbsolute, join } from "node:path";

export const resolvePath = (cwd, inputPath) => {
  return isAbsolute(inputPath) ? inputPath : join(cwd, inputPath);
};

export const resolveParentDirectory = (cwd) => {
  return dirname(cwd);
};
