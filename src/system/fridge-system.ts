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

export interface ArrivedAtFridgeEventData {
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
  targetInstanceId: string;
}

export interface FoodFoundEventData extends Record<string, unknown> {
  instanceId: string;
  foundFood: FoodType[];
  targetInstanceId: string;
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
        instanceId: instanceId,
        event: "STARTED_MOVING",
        data: {
          instanceId: instanceId,
          movementMethod: "walking",
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
  const instance = component.getInstance(instanceId) as PersonData | undefined;
  if (!instance) return {};

  const arrivalData = data as unknown as ArrivedAtFridgeEventData;
  return {
    send: [
      {
        component: "fridge",
        instanceId: arrivalData.fridgeId,
        event: "OPENED_FRIDGE",
        data: {
          instanceId: arrivalData.fridgeId,
          movementMethod: arrivalData.movementMethod,
          personId: instanceId,
          requestedFood: arrivalData.requestedFood,
          targetInstanceId: arrivalData.fridgeId,
        } as Record<string, unknown>,
      },
    ],
  };
});

fridge.on("OPENED_FRIDGE", async (instanceId, data, component) => {
  const openData = data as unknown as OpenFridgeEventData;
  const fridgeInstance = component.getInstance(openData.targetInstanceId) as
    | FridgeData
    | undefined;
  const personInstance = person.getInstance(openData.personId) as
    | PersonData
    | undefined;

  if (!fridgeInstance || !personInstance) return {};

  // Find requested food items that are available in the fridge
  const foundFood = openData.requestedFood.filter((food: FoodType) =>
    fridgeInstance.food.includes(food),
  );

  // Remove found food from fridge
  const remainingFood = fridgeInstance.food.filter(
    (food: FoodType) => !foundFood.includes(food),
  );

  return {
    update: {
      isOpen: true,
      food: remainingFood,
    },
    send: [
      {
        component: "person",
        instanceId: openData.personId,
        event: "FOOD_FOUND",
        data: {
          foundFood,
          targetInstanceId: openData.personId,
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
      food: [...(instance.food || []), ...(foodData.foundFood || [])],
      isHungry: false,
    },
  };
});
