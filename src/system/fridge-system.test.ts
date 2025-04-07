import { describe, test, expect } from "vitest";
import { system, person, fridge } from "./fridge-system";

describe("Fridge System", () => {
  test("should handle the complete hunger to food found event chain", async () => {
    // Create instances with initial states
    const personId = "person_1";
    const fridgeId = "fridge_1";

    person.createInstance(personId, {
      id: personId,
      isHungry: false,
      movementMethod: "walking",
      food: [],
    });

    fridge.createInstance(fridgeId, {
      id: fridgeId,
      food: ["pizza", "salad", "ice cream"],
      isOpen: false,
    });

    // Queue the initial hunger event
    system.queueEvent("person", personId, "FELT_HUNGER", {
      instanceId: personId,
      food: ["pizza"],
      fridgeId: fridgeId,
    });

    // Process all events in the chain
    await system.processEvents(); // Process FELT_HUNGER
    await system.processEvents(); // Process STARTED_MOVING
    await system.processEvents(); // Process ARRIVED_AT_FRIDGE
    await system.processEvents(); // Process OPENED_FRIDGE
    await system.processEvents(); // Process FOOD_FOUND

    // Verify final states
    const personState = person.getInstance(personId);
    const fridgeState = fridge.getInstance(fridgeId);

    expect(personState?.isHungry).toBe(false);
    expect(personState?.food).toEqual(["pizza"]);
    expect(fridgeState?.isOpen).toBe(true);
    expect(fridgeState?.food).toEqual(["salad", "ice cream"]);
  });

  test("should handle movement method changes", async () => {
    const personId = "person_2";
    person.createInstance(personId, {
      id: personId,
      isHungry: false,
      movementMethod: "walking",
      food: [],
    });

    system.queueEvent("person", personId, "STARTED_MOVING", {
      instanceId: personId,
      movementMethod: "wheelchair",
      requestedFood: [],
    });

    await system.processEvents(); // Process STARTED_MOVING
    await system.processEvents(); // Process ARRIVED_AT_FRIDGE
    await system.processEvents(); // Process OPENED_FRIDGE
    await system.processEvents(); // Process FOOD_FOUND

    const personState = person.getInstance(personId);
    expect(personState?.movementMethod).toBe("wheelchair");
  });

  test("should maintain separate states for multiple instances", async () => {
    const person1Id = "person_3";
    const person2Id = "person_4";
    const fridge1Id = "fridge_2";
    const fridge2Id = "fridge_3";

    person.createInstance(person1Id, {
      id: person1Id,
      isHungry: false,
      movementMethod: "walking",
      food: [],
    });

    person.createInstance(person2Id, {
      id: person2Id,
      isHungry: false,
      movementMethod: "walking",
      food: [],
    });

    fridge.createInstance(fridge1Id, {
      id: fridge1Id,
      food: ["pizza", "salad", "ice cream"],
      isOpen: false,
    });

    fridge.createInstance(fridge2Id, {
      id: fridge2Id,
      food: ["pizza", "salad", "ice cream"],
      isOpen: false,
    });

    // Queue events for person1
    system.queueEvent("person", person1Id, "FELT_HUNGER", {
      instanceId: person1Id,
      food: ["pizza"],
      fridgeId: fridge1Id,
    });
    await system.processEvents(); // Process FELT_HUNGER
    await system.processEvents(); // Process STARTED_MOVING
    await system.processEvents(); // Process ARRIVED_AT_FRIDGE
    await system.processEvents(); // Process OPENED_FRIDGE
    await system.processEvents(); // Process FOOD_FOUND

    const person1State = person.getInstance(person1Id);
    const person2State = person.getInstance(person2Id);
    const fridge1State = fridge.getInstance(fridge1Id);
    const fridge2State = fridge.getInstance(fridge2Id);

    expect(person1State?.isHungry).toBe(false);
    expect(person2State?.isHungry).toBe(false);
    expect(fridge1State?.isOpen).toBe(true);
    expect(fridge2State?.isOpen).toBe(false);
  });

  test("should handle multiple food types", async () => {
    const personId = "person_5";
    const fridgeId = "fridge_4";

    person.createInstance(personId, {
      id: personId,
      isHungry: false,
      movementMethod: "walking",
      food: [],
    });

    fridge.createInstance(fridgeId, {
      id: fridgeId,
      food: ["pizza", "salad", "ice cream"],
      isOpen: false,
    });

    // Queue the complete event chain
    system.queueEvent("person", personId, "FELT_HUNGER", {
      instanceId: personId,
      food: ["salad", "ice cream"],
      fridgeId: fridgeId,
    });
    await system.processEvents(); // Process FELT_HUNGER
    await system.processEvents(); // Process STARTED_MOVING
    await system.processEvents(); // Process ARRIVED_AT_FRIDGE
    await system.processEvents(); // Process OPENED_FRIDGE
    await system.processEvents(); // Process FOOD_FOUND

    const personState = person.getInstance(personId);
    const fridgeState = fridge.getInstance(fridgeId);

    console.log("pstate", personState);
    console.log("fstate", fridgeState);
    expect(personState?.food).toEqual(["salad", "ice cream"]);
    expect(fridgeState?.food).toEqual(["pizza"]);
  });
});
