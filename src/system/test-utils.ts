import type {
  BaseSystem,
  BaseSystemComponent,
  BaseSystemComponentDataModel,
  BaseSystemData,
  BaseSystemEvent,
  BaseSystemEventDataModel,
  BaseSystemManager,
  BaseSystemUpdate,
  GlobalComponent,
} from "./base-system";

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

export class TestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestError";
  }
}

export type PropertyValue<T> = T extends { value: infer V } ? V : never;

export interface TestCase<
  T extends BaseSystemComponent<string>,
  CD extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
  SE extends BaseSystemEvent<string>,
  SD extends BaseSystemData<T, CD>,
  ED extends BaseSystemEventDataModel<SE, Record<SE, Record<string, unknown>>>,
> {
  name: string;
  initialEvent?: SE;
  initialEventData?: ED[SE];
  skipInitialization?: boolean;
  expectedState?: {
    [K in keyof SD]?: {
      data: {
        [P in keyof SD[K]["data"]]?: {
          type: "immutable" | "stateful";
          value: PropertyValue<SD[K]["data"][P]>;
        };
      };
    };
  };
  expectedNextEvents?: SE[];
  validate?: (state: SD) => boolean;
  expectedError?: {
    message: string;
  };
}

export async function runTestCase<
  BS extends BaseSystem<T, CD, SE, SD, SU, ED>,
  T extends BaseSystemComponent<string>,
  CD extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
  SE extends BaseSystemEvent<string>,
  SU extends BaseSystemUpdate<T, CD>,
  SD extends BaseSystemData<T, CD>,
  ED extends BaseSystemEventDataModel<
    SE,
    Record<SE, { instanceId?: string } | Record<string, never>>
  >,
>(
  testCase: TestCase<T, CD, SE, SD, ED>,
  manager: BaseSystemManager<BS, T, CD, SE, SU, SD, ED>,
): Promise<void> {
  console.log(`\n🧪 Running test: ${testCase.name}`);

  if (!testCase.skipInitialization) {
    console.log("Initializing system...");
    await manager.processEvent("SYSTEM_INITIALIZED" as SE, {} as ED[SE]);
  }

  if (testCase.initialEvent) {
    console.log(`Processing initial event: ${testCase.initialEvent}...`);
    try {
      await manager.processEvent(
        testCase.initialEvent,
        (testCase.initialEventData ?? {}) as ED[SE],
      );

      // If we have an expected error but no error was thrown, fail the test
      if (testCase.expectedError) {
        throw new TestError(
          `Expected error with message containing "${testCase.expectedError.message}" but no error was thrown`,
        );
      }
    } catch (error) {
      // If we have an expected error, check if the error message matches
      if (testCase.expectedError) {
        if (
          error instanceof Error &&
          error.message.includes(testCase.expectedError.message)
        ) {
          console.log(`✅ Test "${testCase.name}" passed with expected error!`);
          return;
        }
        throw new TestError(
          `Expected error message to contain "${testCase.expectedError.message}" but got "${error instanceof Error ? error.message : String(error)}"`,
        );
      }
      // If we don't have an expected error, re-throw
      throw error;
    }
  }

  // Validate expected state
  if (testCase.expectedState) {
    const currentState = manager.state;
    for (const [component, expectedData] of Object.entries(
      testCase.expectedState,
    )) {
      const actualData = (currentState as Record<string, unknown>)[component];
      if (!actualData) {
        throw new TestError(`Component ${component} not found in state`);
      }

      for (const [key, expectedValue] of Object.entries(
        (expectedData as { data: Record<string, { value: unknown }> }).data,
      )) {
        const actualValue = (
          actualData as { data: Record<string, { value: unknown }> }
        ).data[key];
        if (!actualValue) {
          throw new TestError(`Property ${key} not found in ${component}`);
        }

        if (actualValue.value !== expectedValue.value) {
          const errorMessage = `Expected ${component}.${key} to be ${JSON.stringify(expectedValue.value)}, got ${JSON.stringify(actualValue.value)}`;
          throw new TestError(errorMessage);
        }
      }
    }
  }

  // Validate custom validation function
  if (testCase.validate) {
    if (!testCase.validate(manager.state as unknown as SD)) {
      throw new TestError("Custom validation failed");
    }
  }

  // Validate next events
  if (testCase.expectedNextEvents) {
    const nextEvents = new Set<SE>();
    for (const component of Object.values(manager.state) as Array<{
      events: Record<string, { send: Array<{ event: SE }> }>;
    }>) {
      for (const event of Object.values(component.events)) {
        for (const { event: nextEvent } of event.send) {
          nextEvents.add(nextEvent);
        }
      }
    }

    for (const expectedEvent of testCase.expectedNextEvents) {
      if (!nextEvents.has(expectedEvent)) {
        throw new TestError(`Expected next event ${expectedEvent} not found`);
      }
    }
  }

  console.log(`✅ Test "${testCase.name}" passed!`);
}

// Run all test cases
export async function runTestSuite<
  BS extends BaseSystem<T, CD, SE, SD, SU, ED>,
  T extends BaseSystemComponent<string>,
  CD extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
  SE extends BaseSystemEvent<string>,
  SU extends BaseSystemUpdate<T, CD>,
  SD extends BaseSystemData<T, CD>,
  ED extends BaseSystemEventDataModel<
    SE,
    Record<SE, { instanceId?: string } | Record<string, never>>
  >,
>(
  testCases: TestCase<T, CD, SE, SD, ED>[],
  manager: BaseSystemManager<BS, T, CD, SE, SU, SD, ED>,
): Promise<void> {
  console.log("Starting test suite...");
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      await runTestCase(testCase, manager);
      passed++;
    } catch (error) {
      if (error instanceof TestError) {
        console.error(`❌ Test failed: ${error.message}`);
      } else {
        console.error(`❌ Unexpected error: ${error as Error}`);
      }
      failed++;
    }
  }

  console.log("\nTest suite summary:");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
}
