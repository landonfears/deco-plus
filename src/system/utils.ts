// ANSI color codes
export const testColors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  // Foreground colors
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  },
  // Background colors
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
  },
};

// Helper function to format state output with colors
export function formatState<T extends Record<string, unknown>>(
  state: T,
): string {
  const formattedState = JSON.parse(
    JSON.stringify(state, (key: string, value: unknown): unknown => {
      if (value && typeof value === "object" && "value" in value) {
        return (value as { value: unknown }).value;
      }
      return value;
    }),
  ) as Record<string, unknown>;

  const coloredJson = JSON.stringify(formattedState, null, 2)
    .replace(/"([^"]+)":/g, `${testColors.fg.cyan}"$1"${testColors.reset}:`) // Keys in cyan
    .replace(/: "([^"]+)"/g, `: ${testColors.fg.green}"$1"${testColors.reset}`) // Strings in green
    .replace(/: (\d+)/g, `: ${testColors.fg.yellow}$1${testColors.reset}`) // Numbers in yellow
    .replace(
      /: (true|false)/g,
      `: ${testColors.fg.magenta}$1${testColors.reset}`,
    ) // Booleans in magenta
    .replace(/: null/g, `: ${testColors.fg.red}null${testColors.reset}`); // Null in red

  return coloredJson;
}
