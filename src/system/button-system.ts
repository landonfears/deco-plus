import {
  createSystemManager,
  type BaseSystem,
  type BaseSystemComponent,
  type BaseSystemComponentDataModel,
  type BaseSystemData,
  type BaseSystemEvent,
  type BaseSystemEventDataModel,
  type BaseSystemManager,
  type BaseSystemUpdate,
  type ActionReturnType,
  type ImmutableProperty,
  type StatefulProperty,
} from "./base-system";
import {
  formatState,
  runTestSuite,
  TestError,
  type PropertyValue,
  type TestCase,
} from "./test-utils";

/*
  SYSTEM COMPONENTS

  These components represent the different actors and elements in the system.
*/
type SystemComponent = BaseSystemComponent<
  "internalDev" | "endUser" | "externalDev" | "button" | "deployment"
>;

// System data model
type DeploymentPlatform = "vercel" | "netlify" | "cloudflare";
type PackageManager = "npm" | "pnpm" | "yarn";

/*
  SYSTEM COMPONENT DATA MODEL

  A component can hold data and state in order to describe its features and behavior.
*/
type SystemComponentDataModel = BaseSystemComponentDataModel<
  SystemComponent,
  {
    internalDev: {
      id: ImmutableProperty<string>;
      hasReactApp: StatefulProperty<boolean>;
      hasTested: StatefulProperty<boolean>;
      hasDeployed: StatefulProperty<boolean>;
      hasPublishedPackage: StatefulProperty<boolean>;
    };
    endUser: {
      id: ImmutableProperty<string>;
      hasVisitedSite: StatefulProperty<boolean>;
      clickCount: StatefulProperty<number>;
    };
    externalDev: {
      id: ImmutableProperty<string>;
      packageManager: StatefulProperty<PackageManager>;
      hasInstalledPackage: StatefulProperty<boolean>;
      hasCustomizedButton: StatefulProperty<boolean>;
      hasDeployed: StatefulProperty<boolean>;
      deploymentPlatform: StatefulProperty<DeploymentPlatform>;
    };
    button: {
      id: ImmutableProperty<string>;
      clickCount: StatefulProperty<number>;
      color: StatefulProperty<string>;
      font: StatefulProperty<string>;
    };
    deployment: {
      id: ImmutableProperty<string>;
      platform: StatefulProperty<DeploymentPlatform>;
      isLive: StatefulProperty<boolean>;
    };
  }
>;

/*
  SYSTEM EVENTS

  Events that can occur in the system.
*/
type SystemEvent = BaseSystemEvent<
  | "CREATED_REACT_APP"
  | "TESTED_BUTTON"
  | "DEPLOYED_TO_VERCEL"
  | "PUBLISHED_PACKAGE"
  | "VISITED_SITE"
  | "CLICKED_BUTTON"
  | "INSTALLED_PACKAGE"
  | "CUSTOMIZED_BUTTON"
  | "DEPLOYED_TO_PLATFORM"
  | "SYSTEM_INITIALIZED"
>;

/*
  SYSTEM EVENTS DATA MODEL

  Data associated with each event.
*/
type SystemEventDataModel = BaseSystemEventDataModel<
  SystemEvent,
  {
    CREATED_REACT_APP: Record<string, never>;
    TESTED_BUTTON: Record<string, never>;
    DEPLOYED_TO_VERCEL: Record<string, never>;
    PUBLISHED_PACKAGE: Record<string, never>;
    VISITED_SITE: Record<string, never>;
    CLICKED_BUTTON: Record<string, never>;
    INSTALLED_PACKAGE: {
      packageManager: PackageManager;
    };
    CUSTOMIZED_BUTTON: {
      color: string;
      font: string;
    };
    DEPLOYED_TO_PLATFORM: {
      platform: DeploymentPlatform;
    };
    SYSTEM_INITIALIZED: Record<string, never>;
  }
>;

type SystemData = BaseSystemData<SystemComponent, SystemComponentDataModel>;
type SystemUpdate = BaseSystemUpdate<SystemComponent, SystemComponentDataModel>;

type System = BaseSystem<
  SystemComponent,
  SystemComponentDataModel,
  SystemEvent,
  SystemData,
  SystemUpdate,
  SystemEventDataModel
>;

const system: System = {
  internalDev: {
    data: {
      id: { type: "immutable", value: "internalDev" },
      hasReactApp: { type: "stateful", value: false },
      hasTested: { type: "stateful", value: false },
      hasDeployed: { type: "stateful", value: false },
      hasPublishedPackage: { type: "stateful", value: false },
    },
    events: {
      SYSTEM_INITIALIZED: {
        action: async (): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            internalDev: {
              data: {
                hasReactApp: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [{ event: "CREATED_REACT_APP", data: {} }],
      },
      CREATED_REACT_APP: {
        action: async (): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            internalDev: {
              data: {
                hasReactApp: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [{ event: "TESTED_BUTTON", data: {} }],
      },
      TESTED_BUTTON: {
        action: async (): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            internalDev: {
              data: {
                hasTested: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [],
      },
      DEPLOYED_TO_VERCEL: {
        action: async (): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            internalDev: {
              data: {
                hasDeployed: { type: "stateful", value: true },
              },
            },
            deployment: {
              data: {
                platform: { type: "stateful", value: "vercel" },
                isLive: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [],
      },
      PUBLISHED_PACKAGE: {
        action: async (): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            internalDev: {
              data: {
                hasPublishedPackage: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [],
      },
    },
  },
  endUser: {
    data: {
      id: { type: "immutable", value: "endUser" },
      hasVisitedSite: { type: "stateful", value: false },
      clickCount: { type: "stateful", value: 0 },
    },
    events: {
      VISITED_SITE: {
        action: async (): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            endUser: {
              data: {
                hasVisitedSite: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [],
      },
      CLICKED_BUTTON: {
        action: async (
          _,
          system,
        ): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          const currentUserClicks = system.endUser.data.clickCount.value;
          const currentButtonClicks = system.button.data.clickCount.value;

          return {
            endUser: {
              data: {
                clickCount: { type: "stateful", value: currentUserClicks + 1 },
              },
            },
            button: {
              data: {
                clickCount: {
                  type: "stateful",
                  value: currentButtonClicks + 1,
                },
              },
            },
          };
        },
        send: [],
      },
    },
  },
  externalDev: {
    data: {
      id: { type: "immutable", value: "externalDev" },
      packageManager: { type: "stateful", value: "npm" },
      hasInstalledPackage: { type: "stateful", value: false },
      hasCustomizedButton: { type: "stateful", value: false },
      hasDeployed: { type: "stateful", value: false },
      deploymentPlatform: { type: "stateful", value: "vercel" },
    },
    events: {
      INSTALLED_PACKAGE: {
        action: async (
          data,
        ): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            externalDev: {
              data: {
                packageManager: {
                  type: "stateful",
                  value: data.packageManager,
                },
                hasInstalledPackage: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [],
      },
      CUSTOMIZED_BUTTON: {
        action: async (
          data,
        ): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            externalDev: {
              data: {
                hasCustomizedButton: { type: "stateful", value: true },
              },
            },
            button: {
              data: {
                color: { type: "stateful", value: data.color },
                font: { type: "stateful", value: data.font },
              },
            },
          };
        },
        send: [],
      },
      DEPLOYED_TO_PLATFORM: {
        action: async (
          data,
        ): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            externalDev: {
              data: {
                hasDeployed: { type: "stateful", value: true },
                deploymentPlatform: { type: "stateful", value: data.platform },
              },
            },
            deployment: {
              data: {
                platform: { type: "stateful", value: data.platform },
                isLive: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [],
      },
    },
  },
  button: {
    data: {
      id: { type: "immutable", value: "button" },
      clickCount: { type: "stateful", value: 0 },
      color: { type: "stateful", value: "default" },
      font: { type: "stateful", value: "default" },
    },
    events: {},
  },
  deployment: {
    data: {
      id: { type: "immutable", value: "deployment" },
      platform: { type: "stateful", value: "vercel" },
      isLive: { type: "stateful", value: false },
    },
    events: {},
  },
};

type SystemManager = BaseSystemManager<
  System,
  SystemComponent,
  SystemComponentDataModel,
  SystemEvent,
  SystemUpdate,
  SystemData,
  SystemEventDataModel
>;

export const manager: SystemManager = createSystemManager<
  System,
  SystemComponent,
  SystemComponentDataModel,
  SystemEvent,
  SystemUpdate,
  SystemData,
  SystemEventDataModel
>(system);

// Example usage and tests
type Scenario = "internalDev" | "endUser" | "externalDev" | "combined";

interface TestOptions {
  initialEvent?: SystemEvent;
  initialEventData?: Record<string, never>;
  skipInitialization?: boolean;
}

async function testButtonSystem(scenario: Scenario, options: TestOptions = {}) {
  console.log(`\nRunning ${scenario} scenario...`);
  console.log("Initial state:", formatState(manager.state));

  if (!options.skipInitialization) {
    // Start with SYSTEM_INITIALIZED for all scenarios
    console.log("\nInitializing system...");
    await manager.processEvent("SYSTEM_INITIALIZED", {});
    console.log("After initialization:", formatState(manager.state));
  }

  if (options.initialEvent) {
    console.log(`\nProcessing initial event: ${options.initialEvent}...`);
    await manager.processEvent(
      options.initialEvent,
      options.initialEventData ?? {},
    );
    console.log("After initial event:", formatState(manager.state));
  }

  switch (scenario) {
    case "internalDev": {
      // Internal developer workflow
      console.log("\nInternal developer creates React app...");
      await manager.processEvent("CREATED_REACT_APP", {});
      console.log(
        "After creating app:",
        formatState(manager.state.internalDev.data),
      );

      console.log("\nInternal developer tests button...");
      await manager.processEvent("TESTED_BUTTON", {});
      console.log(
        "After testing:",
        formatState(manager.state.internalDev.data),
      );

      console.log("\nInternal developer deploys to Vercel...");
      await manager.processEvent("DEPLOYED_TO_VERCEL", {});
      console.log(
        "After deploying:",
        formatState(manager.state.internalDev.data),
      );
      console.log(
        "Deployment status:",
        formatState(manager.state.deployment.data),
      );

      console.log("\nInternal developer publishes package...");
      await manager.processEvent("PUBLISHED_PACKAGE", {});
      console.log(
        "After publishing:",
        formatState(manager.state.internalDev.data),
      );
      break;
    }

    case "endUser": {
      // End user workflow
      console.log("\nEnd user visits site...");
      await manager.processEvent("VISITED_SITE", {});
      console.log("After visiting:", formatState(manager.state.endUser.data));

      console.log("\nEnd user clicks button...");
      await manager.processEvent("CLICKED_BUTTON", {});
      console.log("After clicking:", formatState(manager.state.endUser.data));
      console.log("Button state:", formatState(manager.state.button.data));

      console.log("\nEnd user clicks button again...");
      await manager.processEvent("CLICKED_BUTTON", {});
      console.log(
        "After second click:",
        formatState(manager.state.endUser.data),
      );
      console.log("Button state:", formatState(manager.state.button.data));
      break;
    }

    case "externalDev": {
      // External developer workflow
      console.log("\nExternal developer installs package...");
      await manager.processEvent("INSTALLED_PACKAGE", {
        packageManager: "pnpm",
      });
      console.log(
        "After installing:",
        formatState(manager.state.externalDev.data),
      );

      console.log("\nExternal developer customizes button...");
      await manager.processEvent("CUSTOMIZED_BUTTON", {
        color: "blue",
        font: "Arial",
      });
      console.log(
        "After customizing:",
        formatState(manager.state.externalDev.data),
      );
      console.log(
        "Button customization:",
        formatState(manager.state.button.data),
      );

      console.log("\nExternal developer deploys to Netlify...");
      await manager.processEvent("DEPLOYED_TO_PLATFORM", {
        platform: "netlify",
      });
      console.log(
        "After deploying:",
        formatState(manager.state.externalDev.data),
      );
      console.log(
        "Deployment status:",
        formatState(manager.state.deployment.data),
      );
      break;
    }

    case "combined": {
      // Run all scenarios in sequence
      console.log("\n=== Internal Developer Journey ===");
      await testButtonSystem("internalDev");

      console.log("\n=== End User Journey ===");
      await testButtonSystem("endUser");

      console.log("\n=== External Developer Journey ===");
      await testButtonSystem("externalDev");
      break;
    }
  }
}

// Example usage:
// Run with default initialization
// void testButtonSystem("internalDev");

// Run without initialization
// void testButtonSystem("internalDev", { skipInitialization: true });

// Run with custom initial event
// void testButtonSystem("internalDev", {
//   initialEvent: "CREATED_REACT_APP",
//   skipInitialization: true
// });

// Or run the combined scenario
// void testButtonSystem("combined");

// Example test cases
const testCases: TestCase<
  SystemComponent,
  SystemComponentDataModel,
  SystemEvent,
  SystemData
>[] = [
  {
    name: "System initialization",
    expectedState: {
      internalDev: {
        data: {
          hasReactApp: { type: "stateful", value: true },
        },
      },
    },
    expectedNextEvents: ["CREATED_REACT_APP"],
  },
  {
    name: "End user journey",
    initialEvent: "VISITED_SITE",
    skipInitialization: true,
    expectedState: {
      endUser: {
        data: {
          hasVisitedSite: { type: "stateful", value: true },
        },
      },
    },
  },
  {
    name: "Button click increments",
    initialEvent: "CLICKED_BUTTON",
    skipInitialization: true,
    validate: (state) => {
      return (
        state.endUser.data.clickCount.value === 1 &&
        state.button.data.clickCount.value === 1
      );
    },
  },
];

// Run the test suite
void runTestSuite(
  testCases,
  manager as unknown as BaseSystemManager<
    System,
    SystemComponent,
    SystemComponentDataModel,
    SystemEvent,
    SystemUpdate,
    SystemData,
    SystemEventDataModel
  >,
);
