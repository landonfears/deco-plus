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
import { runTestSuite, type TestCase } from "./test-utils";

/*
  SYSTEM COMPONENTS
*/
type SystemComponent = BaseSystemComponent<"person" | "fridge">;

type MovementMethod = "walking" | "wheelchair";

type FoodType = "pizza" | "salad" | "ice cream";

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

type SystemEvent = BaseSystemEvent<
  | "SYSTEM_INITIALIZED"
  | "FELT_HUNGER"
  | "STARTED_MOVING"
  | "ARRIVED_AT_FRIDGE"
  | "OPENED_FRIDGE"
  | "FOOD_FOUND"
>;

type SystemEventDataModel = BaseSystemEventDataModel<
  SystemEvent,
  {
    SYSTEM_INITIALIZED: Record<string, never>;
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
  }
>;

type SystemUpdate = BaseSystemUpdate<SystemComponent, SystemComponentDataModel>;

type SystemData = BaseSystemData<SystemComponent, SystemComponentDataModel>;

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
          eventData: SystemEventDataModel["STARTED_MOVING"],
        ): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            person: {
              data: {
                movementMethod: {
                  type: "stateful",
                  value: eventData.movementMethod,
                },
              },
            },
          };
        },
        send: [
          {
            event: "ARRIVED_AT_FRIDGE",
            data: {
              instanceId: "person_2",
              movementMethod: "walking",
            } as SystemEventDataModel["ARRIVED_AT_FRIDGE"],
          },
        ],
      },
      FELT_HUNGER: {
        action: async (
          eventData: SystemEventDataModel["FELT_HUNGER"],
          state: SystemData,
        ): Promise<
          ActionReturnType<SystemComponent, SystemComponentDataModel>
        > => {
          return {
            person: {
              data: {
                isHungry: { type: "stateful", value: true },
                movementMethod: { type: "stateful", value: "walking" },
                food: { type: "stateful", value: [] },
              },
            },
          };
        },
        send: [
          {
            event: "STARTED_MOVING",
            data: {
              instanceId: "person_2",
              movementMethod: "walking",
            } as SystemEventDataModel["STARTED_MOVING"],
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

const manager = createSystemManager<
  System,
  SystemComponent,
  SystemComponentDataModel,
  SystemEvent,
  SystemUpdate,
  SystemData,
  SystemEventDataModel
>(system);

// Test cases
const testCases: TestCase<
  SystemComponent,
  SystemComponentDataModel,
  SystemEvent,
  SystemData,
  SystemEventDataModel
>[] = [
  {
    name: "System initialization",
    validate: (state: SystemData) => {
      // Check person state
      const person = state.person.data;
      if (person.isHungry.value !== false) return false;
      if (person.movementMethod.value !== "walking") return false;
      if (person.food.value.length !== 0) return false;

      // Check fridge state
      const fridge = state.fridge.data;
      if (fridge.isOpen.value !== false) return false;
      if (fridge.food.value.length !== 3) return false;
      if (!fridge.food.value.includes("pizza")) return false;
      if (!fridge.food.value.includes("salad")) return false;
      if (!fridge.food.value.includes("ice cream")) return false;

      return true;
    },
  },
  {
    name: "Instance ID type validation",
    initialEvent: "OPENED_FRIDGE",
    initialEventData: {
      instanceId: "person_1",
      movementMethod: "walking",
    },
    skipInitialization: true,
    expectedError: {
      message: "Invalid instance ID: person_1 for event OPENED_FRIDGE",
    },
  },
  {
    name: "Duplicate instance ID prevention",
    initialEvent: "OPENED_FRIDGE",
    initialEventData: {
      instanceId: "fridge_1",
      movementMethod: "walking",
    },
    skipInitialization: true,
    expectedError: {
      message: "Duplicate instance ID: fridge_1",
    },
  },
  {
    name: "FELT_HUNGER event updates person state",
    initialEvent: "FELT_HUNGER",
    initialEventData: {
      instanceId: "person_2",
      food: ["pizza"],
    },
    skipInitialization: false,
    expectedState: {
      person: {
        data: {
          isHungry: { type: "stateful", value: true },
        },
      },
    },
    expectedNextEvents: ["STARTED_MOVING"],
  },
  {
    name: "STARTED_MOVING event updates movement method",
    initialEvent: "STARTED_MOVING",
    initialEventData: {
      instanceId: "person_3",
      movementMethod: "wheelchair",
    },
    skipInitialization: true,
    expectedState: {
      person: {
        data: {
          movementMethod: { type: "stateful", value: "wheelchair" },
        },
      },
    },
    expectedNextEvents: ["ARRIVED_AT_FRIDGE"],
  },
  {
    name: "OPENED_FRIDGE event opens fridge",
    initialEvent: "OPENED_FRIDGE",
    initialEventData: {
      instanceId: "fridge_2",
      movementMethod: "walking",
    },
    skipInitialization: true,
    expectedState: {
      fridge: {
        data: {
          isOpen: { type: "stateful", value: true },
        },
      },
    },
    expectedNextEvents: ["FOOD_FOUND"],
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
