export const parseCommandLine = (line) => {
  const trimmedLine = line.trim();
  const rawTokens = trimmedLine.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const tokens = rawTokens.map((token) => token.replace(/^"(.*)"$/, "$1"));

  return {
    command: tokens[0] ?? "",
    args: tokens.slice(1),
  };
};
