import { beforeEach, describe, test, expect } from "vitest";
import { System, Component } from "./core-system";

// Type definitions for test data
interface PersonData {
  name: string;
  age: number;
  isHungry: boolean;
  movementMethod: string;
}

interface MovementEventData {
  movementMethod: string;
}

interface AgeEventData {
  age: number;
}

describe("Core System", () => {
  let system: System;
  let person: Component;

  beforeEach(() => {
    system = new System();
    person = system.createComponent("person", {
      name: "",
      age: 0,
      isHungry: false,
      movementMethod: "walking",
    });
  });

  describe("Component Management", () => {
    test("should create and retrieve components", () => {
      const retrievedPerson = system.getComponent("person");
      expect(retrievedPerson).toBe(person);
      expect(system.getComponent("nonexistent")).toBeUndefined();
    });

    test("should create instances with initial data", () => {
      person.createInstance("person_1", { name: "Alice", age: 30 });
      const instance = person.getInstance("person_1") as unknown as PersonData;

      expect(instance).toEqual({
        name: "Alice",
        age: 30,
        isHungry: false,
        movementMethod: "walking",
      });
    });

    test("should handle non-existent instances", () => {
      expect(person.getInstance("nonexistent")).toBeUndefined();
    });
  });

  describe("Event Handling", () => {
    test("should register and process events", async () => {
      person.on("FELT_HUNGER", async (instanceId, data, component) => {
        return {
          update: { isHungry: true },
          send: [
            { event: "STARTED_MOVING", data: { movementMethod: "walking" } },
          ],
        };
      });

      person.createInstance("person_1");
      system.queueEvent("person", "person_1", "FELT_HUNGER", {});
      await system.processEvents();

      const instance = person.getInstance("person_1") as unknown as PersonData;
      expect(instance?.isHungry).toBe(true);
    });

    test("should handle events for non-existent instances", async () => {
      person.on("FELT_HUNGER", async () => ({
        update: { isHungry: true },
      }));

      system.queueEvent("person", "nonexistent", "FELT_HUNGER", {});
      await system.processEvents();

      // Should not throw and should not create instance
      expect(person.getInstance("nonexistent")).toBeUndefined();
    });

    test("should process event chains", async () => {
      person.on("FELT_HUNGER", async () => ({
        send: [
          { event: "STARTED_MOVING", data: { movementMethod: "walking" } },
        ],
      }));

      person.on("STARTED_MOVING", async (instanceId, data) => {
        const movementData = data as unknown as MovementEventData;
        return {
          update: { movementMethod: movementData.movementMethod },
        };
      });

      person.createInstance("person_1");
      system.queueEvent("person", "person_1", "FELT_HUNGER", {});
      await system.processEvents();

      const instance = person.getInstance("person_1") as unknown as PersonData;
      expect(instance?.movementMethod).toBe("walking");
    });
  });

  describe("Event Queue Management", () => {
    test("should process events in order", async () => {
      const events: string[] = [];

      person.on("EVENT_1", async () => {
        events.push("1");
        return { send: [{ event: "EVENT_2", data: {} }] };
      });

      person.on("EVENT_2", async () => {
        events.push("2");
        return { send: [{ event: "EVENT_3", data: {} }] };
      });

      person.on("EVENT_3", async () => {
        events.push("3");
        return {};
      });

      person.createInstance("person_1");
      system.queueEvent("person", "person_1", "EVENT_1", {});
      await system.processEvents();

      expect(events).toEqual(["1", "2", "3"]);
    });

    test("should handle empty event queue", async () => {
      await system.processEvents(); // Should not throw
    });
  });

  describe("Instance State Management", () => {
    test("should maintain separate states for multiple instances", async () => {
      person.on("STARTED_MOVING", async (instanceId, data) => {
        const movementData = data as unknown as MovementEventData;
        return {
          update: { movementMethod: movementData.movementMethod },
        };
      });

      person.createInstance("person_1");
      person.createInstance("person_2");

      system.queueEvent("person", "person_1", "STARTED_MOVING", {
        movementMethod: "walking",
      });
      system.queueEvent("person", "person_2", "STARTED_MOVING", {
        movementMethod: "wheelchair",
      });

      await system.processEvents();

      const person1State = person.getInstance(
        "person_1",
      ) as unknown as PersonData;
      const person2State = person.getInstance(
        "person_2",
      ) as unknown as PersonData;

      expect(person1State?.movementMethod).toBe("walking");
      expect(person2State?.movementMethod).toBe("wheelchair");
    });

    test("should update instance state correctly", async () => {
      person.on("UPDATE_AGE", async (instanceId, data) => {
        const ageData = data as unknown as AgeEventData;
        return {
          update: { age: ageData.age },
        };
      });

      person.createInstance("person_1", { age: 20 });
      system.queueEvent("person", "person_1", "UPDATE_AGE", { age: 30 });
      await system.processEvents();

      const instance = person.getInstance("person_1") as unknown as PersonData;
      expect(instance?.age).toBe(30);
    });
  });
});
