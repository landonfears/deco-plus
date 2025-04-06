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
import { formatState } from "./test-utils";

/*
  SYSTEM COMPONENTS

  These components are the relevant unitsmake up the system.
*/
type SystemComponent = BaseSystemComponent<"person" | "fridge">;

// System data model
type MovementMethod = "walking" | "wheelchair";
type FoodType = "pizza" | "salad" | "ice cream";

/*
  SYSTEM COMPONENT DATA MODEL

  A component can hold data and state in order to describe its features and behavior.
  Properties marked as "immutable" cannot be changed after initialization,
  while "stateful" properties can be modified during the system's lifecycle.
*/
type SystemComponentDataModel = BaseSystemComponentDataModel<
  SystemComponent,
  {
    person: {
      id: ImmutableProperty<string>;
      isHungry: StatefulProperty<boolean>;
      movementMethod: StatefulProperty<MovementMethod>;
      food: StatefulProperty<FoodType[]>;
    };
    fridge: {
      id: ImmutableProperty<string>;
      food: StatefulProperty<FoodType[]>;
      isOpen: StatefulProperty<boolean>;
    };
  }
>;

/*
  SYSTEM EVENTS

  All events must be named in the past tense verb format, nothing that "something happened"
  e.g. "FELT_HUNGER"
  e.g. "FINISHED_MOVING"
*/
type SystemEvent = BaseSystemEvent<
  | "FELT_HUNGER"
  | "STARTED_MOVING"
  | "ARRIVED_AT_FRIDGE"
  | "OPENED_FRIDGE"
  | "FOOD_FOUND"
  | "ATE_FOOD"
  | "CLOSED_FRIDGE"
>;

/*
  SYSTEM EVENTS DATA MODEL

  Some event may have data associated with them (similar to a click event passing an event with info about the element that was clicked, etc.)

  This data can make it easier to understand the context of the event.
*/
type SystemEventDataModel = BaseSystemEventDataModel<
  SystemEvent,
  {
    FELT_HUNGER: {
      instanceId: `person_${string}`;
      food: FoodType[];
    };
    STARTED_MOVING: {
      instanceId: `person_${string}`;
      movementMethod: MovementMethod;
    };
    ARRIVED_AT_FRIDGE: {
      instanceId: `person_${string}`;
      movementMethod: MovementMethod;
    };
    OPENED_FRIDGE: {
      instanceId: `fridge_${string}`;
      movementMethod: MovementMethod;
    };
    FOOD_FOUND: {
      instanceId: `fridge_${string}`;
      movementMethod: MovementMethod;
      food: FoodType[];
    };
    ATE_FOOD: {
      instanceId: `person_${string}`;
      food: FoodType[];
    };
    CLOSED_FRIDGE: {
      instanceId: `fridge_${string}`;
      movementMethod: MovementMethod;
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
  person: {
    data: {
      id: { type: "immutable", value: "person" },
      isHungry: { type: "stateful", value: false },
      movementMethod: { type: "stateful", value: "walking" },
      food: { type: "stateful", value: [] },
    },
    events: {
      STARTED_MOVING: {
        action: async (
          data: {
            instanceId: `person_${string}`;
            movementMethod: MovementMethod;
          },
          system,
        ): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            person: {
              data: {
                movementMethod: {
                  type: "stateful",
                  value: data.movementMethod,
                },
              },
            },
          };
        },
        send: [
          {
            event: "ARRIVED_AT_FRIDGE",
            data: { instanceId: "person_1", movementMethod: "walking" },
          },
        ],
      },
      FELT_HUNGER: {
        action: async (data: {
          instanceId: `person_${string}`;
          food: FoodType[];
        }): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            person: {
              data: {
                isHungry: { type: "stateful", value: true },
                movementMethod: { type: "stateful", value: "walking" },
              },
            },
          };
        },
        send: [
          {
            event: "STARTED_MOVING",
            data: { instanceId: "person_1", movementMethod: "walking" },
          },
        ],
      },
    },
  },
  fridge: {
    data: {
      id: { type: "immutable", value: "fridge" },
      food: { type: "stateful", value: ["pizza", "salad", "ice cream"] },
      isOpen: { type: "stateful", value: false },
    },
    events: {
      OPENED_FRIDGE: {
        action: async (data: {
          instanceId: `fridge_${string}`;
          movementMethod: MovementMethod;
        }): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            fridge: {
              data: {
                isOpen: { type: "stateful", value: true },
              },
            },
          };
        },
        send: [
          {
            event: "FOOD_FOUND",
            data: {
              instanceId: "fridge_1",
              movementMethod: "walking",
              food: ["pizza"],
            },
          },
        ],
      },
    },
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
async function testSystemManager() {
  console.log("Initial state:", formatState(manager.state));

  // Reset instance IDs before starting tests
  manager.resetInstanceIds();

  // Test instance ID uniqueness
  console.log("\nTesting instance ID uniqueness...");

  try {
    // This should fail at runtime because we're using the wrong instance ID
    await manager.processEvent("OPENED_FRIDGE", {
      instanceId: "person_1",
      movementMethod: "walking",
    });
  } catch {
    console.log("✅ Runtime check correctly prevents wrong instance IDs");
  }

  // Reset instance IDs before duplicate ID test
  manager.resetInstanceIds();

  // Test duplicate instance IDs
  console.log("\nTesting duplicate instance IDs...");

  let duplicateAllowed = false;

  try {
    // First fridge with ID "fridge_1"
    await manager.processEvent("OPENED_FRIDGE", {
      instanceId: "fridge_1",
      movementMethod: "walking",
    });

    // Second fridge with the same ID "fridge_1" - this should fail
    await manager.processEvent("OPENED_FRIDGE", {
      instanceId: "fridge_1",
      movementMethod: "wheelchair",
    });

    duplicateAllowed = true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Duplicate instance ID")
    ) {
      console.log("✅ Runtime check correctly prevents duplicate instance IDs");
    } else {
      // Re-throw if it's not the error we're expecting
      throw error;
    }
  }

  if (duplicateAllowed) {
    console.error("❌ Test failed: System allowed duplicate instance IDs");
  }

  // Reset instance IDs before remaining tests
  manager.resetInstanceIds();

  // Test FELT_HUNGER event
  console.log("\nProcessing FELT_HUNGER event...");
  try {
    await manager.processEvent("FELT_HUNGER", {
      instanceId: "person_2",
      food: ["pizza"],
    });
    console.log("After FELT_HUNGER:", formatState(manager.state.person.data));
  } catch (error) {
    console.error("Error in FELT_HUNGER test:", error);
  }

  // Test STARTED_MOVING event
  console.log("\nProcessing STARTED_MOVING event...");
  try {
    await manager.processEvent("STARTED_MOVING", {
      instanceId: "person_3",
      movementMethod: "wheelchair",
    });
    console.log(
      "After STARTED_MOVING:",
      formatState(manager.state.person.data),
    );
  } catch (error) {
    console.error("Error in STARTED_MOVING test:", error);
  }

  // Test OPENED_FRIDGE event
  console.log("\nProcessing OPENED_FRIDGE event...");
  try {
    await manager.processEvent("OPENED_FRIDGE", {
      instanceId: "fridge_2",
      movementMethod: "wheelchair",
    });
    console.log("After OPENED_FRIDGE:", formatState(manager.state.fridge.data));
  } catch (error) {
    console.error("Error in OPENED_FRIDGE test:", error);
  }
}

// Run the tests
void testSystemManager();
