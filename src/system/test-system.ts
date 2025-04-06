import {
  createSystemManager,
  type BaseSystem,
  // BaseComponentData,
  type BaseSystemComponent,
  type BaseSystemComponentDataModel,
  type BaseSystemData,
  type BaseSystemEvent,
  type BaseSystemEventDataModel,
  type BaseSystemManager,
  type BaseSystemUpdate,
  type ActionReturnType,
} from "./base-system";

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
*/
type SystemComponentDataModel = BaseSystemComponentDataModel<
  SystemComponent,
  {
    person: {
      id: string;
      isHungry: boolean;
      movementMethod: MovementMethod;
      food: FoodType[];
    };
    fridge: {
      id: string;
      food: FoodType[];
      isOpen: boolean;
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
      food: FoodType[];
    };
    STARTED_MOVING: {
      movementMethod: MovementMethod;
    };
    ARRIVED_AT_FRIDGE: {
      movementMethod: MovementMethod;
    };
    OPENED_FRIDGE: {
      movementMethod: MovementMethod;
    };
    FOOD_FOUND: {
      movementMethod: MovementMethod;
      food: FoodType[];
    };
    ATE_FOOD: {
      food: FoodType[];
    };
    CLOSED_FRIDGE: {
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
      id: "person",
      isHungry: false,
      movementMethod: "walking",
      food: [],
    },
    events: {
      STARTED_MOVING: {
        action: async (
          data,
          system,
        ): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          console.log("Person is hungry:", system.person.data.isHungry);
          return {
            person: {
              data: {
                movementMethod: data.movementMethod,
              },
            },
          };
        },
        send: [
          {
            event: "ARRIVED_AT_FRIDGE",
            data: {
              movementMethod: "walking",
            },
          },
        ],
      },
      FELT_HUNGER: {
        action: async (): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            person: {
              data: {
                isHungry: true,
                movementMethod: "walking",
              },
            },
          };
        },
        send: [
          {
            event: "STARTED_MOVING",
            data: {
              movementMethod: "walking",
            },
          },
        ],
      },
      OPENED_FRIDGE: {
        action: async (): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            fridge: { data: { isOpen: true } },
          };
        },
        send: [
          {
            event: "FOOD_FOUND",
            data: { movementMethod: "walking", food: ["pizza"] },
          },
        ],
      },
    },
  },
  fridge: {
    data: {
      id: "fridge",
      food: ["pizza", "salad", "ice cream"],
      isOpen: false,
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
async function testSystemManager() {
  console.log("Initial state:", manager.state);

  // Test FELT_HUNGER event
  console.log("\nProcessing FELT_HUNGER event...");
  await manager.processEvent("FELT_HUNGER", {
    food: ["pizza"],
  });
  console.log("After FELT_HUNGER:", manager.state.person.data);

  // Test STARTED_MOVING event
  console.log("\nProcessing STARTED_MOVING event...");
  await manager.processEvent("STARTED_MOVING", {
    movementMethod: "wheelchair",
  });
  console.log("After STARTED_MOVING:", manager.state.person.data);

  // Test OPENED_FRIDGE event
  console.log("\nProcessing OPENED_FRIDGE event...");
  await manager.processEvent("OPENED_FRIDGE", {
    movementMethod: "wheelchair",
  });
  console.log("After OPENED_FRIDGE:", manager.state.fridge.data);
}

// Run the tests
void testSystemManager();
