import { System, Component } from "./core-system";

// Types
export type MovementMethod = "walking" | "wheelchair";
export type FoodType = "pizza" | "salad" | "ice cream";

// Data interfaces
export interface PersonData {
  id: string;
  isHungry: boolean;
  movementMethod: MovementMethod;
  food: FoodType[];
}

export interface FridgeData {
  id: string;
  food: FoodType[];
  isOpen: boolean;
}

// Event data interfaces
export interface HungerEventData {
  instanceId: string;
  food: FoodType[];
  fridgeId: string;
}

export interface MovementEventData {
  instanceId: string;
  movementMethod: MovementMethod;
  requestedFood: FoodType[];
  fridgeId: string;
}

export interface ArrivalEventData {
  instanceId: string;
  movementMethod: MovementMethod;
  fridgeId: string;
  requestedFood: FoodType[];
}

export interface OpenFridgeEventData {
  instanceId: string;
  movementMethod: MovementMethod;
  personId: string;
  requestedFood: FoodType[];
}

export interface FoodFoundEventData extends Record<string, unknown> {
  instanceId: string;
  foundFood: FoodType[];
}

export interface AteFoodEventData extends Record<string, unknown> {
  instanceId: string;
  food: FoodType[];
}

// Create system and components
export const system = new System();

export const person = system.createComponent("person", {
  id: "",
  isHungry: false,
  movementMethod: "walking" as MovementMethod,
  food: [] as FoodType[],
});

export const fridge = system.createComponent("fridge", {
  id: "",
  food: ["pizza", "salad", "ice cream"] as FoodType[],
  isOpen: false,
});

// Event handlers
person.on("FELT_HUNGER", async (instanceId, data, component) => {
  console.log("hi1");
  const instance = component.getInstance(instanceId) as PersonData | undefined;
  if (!instance) return {};

  const hungerData = data as unknown as HungerEventData;
  return {
    update: {
      isHungry: true,
    },
    send: [
      {
        component: "person",
        event: "STARTED_MOVING",
        data: {
          instanceId: hungerData.instanceId,
          movementMethod: instance.movementMethod,
          requestedFood: hungerData.food,
          fridgeId: hungerData.fridgeId,
        } as Record<string, unknown>,
      },
    ],
  };
});

person.on("STARTED_MOVING", async (instanceId, data, component) => {
  const instance = component.getInstance(instanceId) as PersonData | undefined;
  if (!instance) return {};

  const movementData = data as unknown as MovementEventData;
  return {
    update: {
      movementMethod: movementData.movementMethod,
    },
    send: [
      {
        component: "person",
        event: "ARRIVED_AT_FRIDGE",
        data: {
          instanceId: instanceId,
          movementMethod: movementData.movementMethod,
          fridgeId: movementData.fridgeId,
          requestedFood: movementData.requestedFood,
        } as Record<string, unknown>,
      },
    ],
  };
});

person.on("ARRIVED_AT_FRIDGE", async (instanceId, data, component) => {
  const arrivalData = data as unknown as ArrivalEventData;
  return {
    send: [
      {
        component: "fridge",
        event: "OPENED_FRIDGE",
        data: {
          instanceId: arrivalData.fridgeId,
          movementMethod: arrivalData.movementMethod,
          personId: instanceId,
          requestedFood: arrivalData.requestedFood,
        } as Record<string, unknown>,
      },
    ],
  };
});

fridge.on("OPENED_FRIDGE", async (instanceId, data, component) => {
  const fridgeInstance = component.getInstance(instanceId) as
    | FridgeData
    | undefined;
  const openData = data as unknown as OpenFridgeEventData;
  const personInstance = person.getInstance(openData.personId) as
    | PersonData
    | undefined;

  if (!fridgeInstance || !personInstance) return {};

  // Find requested food items that are available in the fridge
  const foundFood = openData.requestedFood.filter((food: FoodType) =>
    fridgeInstance.food.includes(food),
  );

  console.log("\n=== Food Handling ===");
  console.log("Requested Food:", openData.requestedFood);
  console.log("Fridge Food:", fridgeInstance.food);
  console.log("Found Food:", foundFood);

  // Remove found food from fridge
  const remainingFood = fridgeInstance.food.filter(
    (food: FoodType) => !foundFood.includes(food),
  );

  console.log("Remaining Food:", remainingFood);
  console.log("=====================\n");

  return {
    update: {
      isOpen: true,
      food: remainingFood,
    },
    send: [
      {
        component: "person",
        event: "FOOD_FOUND",
        data: {
          instanceId: openData.personId,
          foundFood,
        } as Record<string, unknown>,
      },
    ],
  };
});

person.on("FOOD_FOUND", async (instanceId, data, component) => {
  const instance = component.getInstance(instanceId) as PersonData | undefined;
  if (!instance) return {};

  const foodData = data as unknown as FoodFoundEventData;
  return {
    update: {
      food: [...instance.food, ...foodData.foundFood],
      isHungry: false,
    },
  };
});
