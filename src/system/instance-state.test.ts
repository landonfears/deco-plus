import { beforeEach, describe, test, expect } from "vitest";
import { System, Component } from "./core-system";

// Type definitions for test data
interface PersonData {
  id: string;
  isHungry: boolean;
  movementMethod: string;
  food: string[];
}

interface MovementEventData {
  movementMethod: string;
}

describe("Instance State Management", () => {
  let system: System;
  let person: Component;

  beforeEach(() => {
    system = new System();
    person = system.createComponent("person", {
      id: "",
      isHungry: false,
      movementMethod: "walking",
      food: [],
    });

    person.on("STARTED_MOVING", async (instanceId, data) => {
      const movementData = data as unknown as MovementEventData;
      return {
        update: {
          movementMethod: movementData.movementMethod,
        },
      };
    });
  });

  test("Multiple person instances maintain separate states", async () => {
    // Create two person instances
    const person = system.getComponent("person");
    if (!person) throw new Error("Person component not found");

    person.createInstance("person_1");
    person.createInstance("person_2");

    // Set different movement methods for each person
    system.queueEvent("person", "person_1", "STARTED_MOVING", {
      movementMethod: "walking",
    });
    system.queueEvent("person", "person_2", "STARTED_MOVING", {
      movementMethod: "wheelchair",
    });

    // Process events
    await system.processEvents();

    // Verify each instance maintains its own state
    const person1State = person.getInstance(
      "person_1",
    ) as unknown as PersonData;
    const person2State = person.getInstance(
      "person_2",
    ) as unknown as PersonData;

    expect(person1State?.movementMethod).toBe("walking");
    expect(person2State?.movementMethod).toBe("wheelchair");
  });
});
