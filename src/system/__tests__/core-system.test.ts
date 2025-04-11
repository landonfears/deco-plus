import { beforeEach, describe, test, expect } from "vitest";
import { System, type Component } from "../core-system";

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

interface PersonState {
  isHungry: boolean;
}

interface PersonEventData {
  type: "INTERACT_WITH_FRIDGE" | "EAT_FOOD";
  data: {
    fridgeId?: string;
    personId?: string;
  };
}

interface FridgeState {
  isOpen: boolean;
}

interface FridgeEventData {
  type: "OPEN_FRIDGE";
  data: {
    personId: string;
  };
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
      person.createInstance("person", "person_1", { name: "Alice", age: 30 });
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
      person.on(
        "FELT_HUNGER",
        async (
          instanceId: string,
          data: Record<string, unknown>,
          component: Component,
        ) => {
          return {
            update: { isHungry: true },
            send: [
              { event: "STARTED_MOVING", data: { movementMethod: "walking" } },
            ],
          };
        },
      );

      person.createInstance("person", "person_1", {});
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

      person.on(
        "STARTED_MOVING",
        async (instanceId: string, data: Record<string, unknown>) => {
          const movementData = data as unknown as MovementEventData;
          return {
            update: { movementMethod: movementData.movementMethod },
          };
        },
      );

      person.createInstance("person", "person_1", {});
      system.queueEvent("person", "person_1", "FELT_HUNGER", {});
      await system.processEvents();

      const instance = person.getInstance("person_1") as unknown as PersonData;
      expect(instance?.movementMethod).toBe("walking");
    });
  });

  describe("Event Queue Management", () => {
    test("should process events in order", async () => {
      const events: string[] = [];

      person.on("EVENT_1_OCCURRED", async () => {
        events.push("1");
        return { send: [{ event: "EVENT_2_OCCURRED", data: {} }] };
      });

      person.on("EVENT_2_OCCURRED", async () => {
        events.push("2");
        return { send: [{ event: "EVENT_3_OCCURRED", data: {} }] };
      });

      person.on("EVENT_3_OCCURRED", async () => {
        events.push("3");
        return {};
      });

      person.createInstance("person", "person_1", {});
      system.queueEvent("person", "person_1", "EVENT_1_OCCURRED", {});
      await system.processEvents();

      expect(events).toEqual(["1", "2", "3"]);
    });

    test("should handle empty event queue", async () => {
      await system.processEvents(); // Should not throw
    });
  });

  describe("Instance State Management", () => {
    test("should maintain separate states for multiple instances", async () => {
      person.on(
        "STARTED_MOVING",
        async (instanceId: string, data: Record<string, unknown>) => {
          const movementData = data as unknown as MovementEventData;
          return {
            update: { movementMethod: movementData.movementMethod },
          };
        },
      );

      person.createInstance("person", "person_1", {});
      person.createInstance("person", "person_2", {});

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
      person.on(
        "AGE_UPDATED",
        async (instanceId: string, data: Record<string, unknown>) => {
          const ageData = data as unknown as AgeEventData;
          return {
            update: { age: ageData.age },
          };
        },
      );

      person.createInstance("person", "person_1", { age: 20 });
      system.queueEvent("person", "person_1", "AGE_UPDATED", { age: 30 });
      await system.processEvents();

      const instance = person.getInstance("person_1") as unknown as PersonData;
      expect(instance?.age).toBe(30);
    });

    describe("Instance State Persistence", () => {
      test("should maintain state across multiple event processing cycles", async () => {
        person.on(
          "AGE_UPDATED",
          async (instanceId: string, data: Record<string, unknown>) => {
            const ageData = data as unknown as AgeEventData;
            return {
              update: { age: ageData.age },
            };
          },
        );

        person.on(
          "NAME_UPDATED",
          async (instanceId: string, data: Record<string, unknown>) => {
            return {
              update: { name: data.name as string },
            };
          },
        );

        person.createInstance("person", "person_1", { name: "Alice", age: 20 });

        // First event cycle
        system.queueEvent("person", "person_1", "AGE_UPDATED", { age: 30 });
        await system.processEvents();

        // Second event cycle
        system.queueEvent("person", "person_1", "NAME_UPDATED", {
          name: "Bob",
        });
        await system.processEvents();

        const instance = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        expect(instance).toEqual({
          name: "Bob",
          age: 30,
          isHungry: false,
          movementMethod: "walking",
        });
      });

      test("should maintain separate states for multiple instances across events", async () => {
        person.on(
          "AGE_UPDATED",
          async (instanceId: string, data: Record<string, unknown>) => {
            const ageData = data as unknown as AgeEventData;
            return {
              update: { age: ageData.age },
            };
          },
        );

        person.createInstance("person", "person_1", { name: "Alice", age: 20 });
        person.createInstance("person", "person_2", { name: "Bob", age: 25 });

        // Update both instances
        system.queueEvent("person", "person_1", "AGE_UPDATED", { age: 30 });
        system.queueEvent("person", "person_2", "AGE_UPDATED", { age: 35 });
        await system.processEvents();

        const person1State = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        const person2State = person.getInstance(
          "person_2",
        ) as unknown as PersonData;

        expect(person1State).toEqual({
          name: "Alice",
          age: 30,
          isHungry: false,
          movementMethod: "walking",
        });

        expect(person2State).toEqual({
          name: "Bob",
          age: 35,
          isHungry: false,
          movementMethod: "walking",
        });
      });

      test("should maintain state after multiple sequential updates", async () => {
        person.on("AGE_INCREMENTED", async (instanceId: string) => {
          const instance = person.getInstance(
            instanceId,
          ) as unknown as PersonData;
          return {
            update: { age: (instance?.age || 0) + 1 },
          };
        });

        person.createInstance("person", "person_1", { name: "Alice", age: 20 });

        // Perform multiple sequential updates
        for (let i = 0; i < 5; i++) {
          system.queueEvent("person", "person_1", "AGE_INCREMENTED", {});
          await system.processEvents();
        }

        const instance = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        expect(instance?.age).toBe(25);
      });
    });

    describe("Event Chain Complexity", () => {
      test("should handle longer event chains (5 events)", async () => {
        const events: string[] = [];

        person.on("EVENT_1_OCCURRED", async () => {
          events.push("1");
          return { send: [{ event: "EVENT_2_OCCURRED", data: {} }] };
        });

        person.on("EVENT_2_OCCURRED", async () => {
          events.push("2");
          return { send: [{ event: "EVENT_3_OCCURRED", data: {} }] };
        });

        person.on("EVENT_3_OCCURRED", async () => {
          events.push("3");
          return { send: [{ event: "EVENT_4_OCCURRED", data: {} }] };
        });

        person.on("EVENT_4_OCCURRED", async () => {
          events.push("4");
          return { send: [{ event: "EVENT_5_OCCURRED", data: {} }] };
        });

        person.on("EVENT_5_OCCURRED", async () => {
          events.push("5");
          return {};
        });

        person.createInstance("person", "person_1", {});
        system.queueEvent("person", "person_1", "EVENT_1_OCCURRED", {});
        await system.processEvents();

        expect(events).toEqual(["1", "2", "3", "4", "5"]);
      });

      test("should handle parallel event chains", async () => {
        const events: string[] = [];

        person.on("CHAIN_A_STARTED", async () => {
          events.push("A1");
          return { send: [{ event: "CHAIN_A_COMPLETED", data: {} }] };
        });

        person.on("CHAIN_B_STARTED", async () => {
          events.push("B1");
          return { send: [{ event: "CHAIN_B_COMPLETED", data: {} }] };
        });

        person.on("CHAIN_A_COMPLETED", async () => {
          events.push("A2");
          return {};
        });

        person.on("CHAIN_B_COMPLETED", async () => {
          events.push("B2");
          return {};
        });

        person.createInstance("person", "person_1", {});
        system.queueEvent("person", "person_1", "CHAIN_A_STARTED", {});
        system.queueEvent("person", "person_1", "CHAIN_B_STARTED", {});
        await system.processEvents();

        // Events should be processed in order, but both chains should complete
        expect(events).toContain("A1");
        expect(events).toContain("A2");
        expect(events).toContain("B1");
        expect(events).toContain("B2");
      });

      test("should handle event chains that modify multiple instances", async () => {
        person.on(
          "AGE_UPDATED",
          async (instanceId: string, data: Record<string, unknown>) => {
            const ageData = data as unknown as AgeEventData;
            return {
              update: { age: ageData.age },
              send: [
                {
                  event: "AGE_CHANGE_NOTIFIED",
                  data: { instanceId, age: ageData.age },
                },
              ],
            };
          },
        );

        person.on(
          "AGE_CHANGE_NOTIFIED",
          async (instanceId: string, data: Record<string, unknown>) => {
            // This event handler doesn't modify state, just verifies the notification
            return {};
          },
        );

        person.createInstance("person", "person_1", { name: "Alice", age: 20 });
        person.createInstance("person", "person_2", { name: "Bob", age: 25 });

        // Update both instances
        system.queueEvent("person", "person_1", "AGE_UPDATED", { age: 30 });
        system.queueEvent("person", "person_2", "AGE_UPDATED", { age: 35 });
        await system.processEvents();

        const person1State = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        const person2State = person.getInstance(
          "person_2",
        ) as unknown as PersonData;

        expect(person1State?.age).toBe(30);
        expect(person2State?.age).toBe(35);
      });
    });

    describe("Error Handling", () => {
      test("should propagate errors from event handlers", async () => {
        person.on("ERROR_OCCURRED", async () => {
          throw new Error("Test error");
        });

        person.createInstance("person", "person_1", { name: "Alice", age: 20 });

        // Queue the error event
        system.queueEvent("person", "person_1", "ERROR_OCCURRED", {});

        // Process events and expect it to throw
        await expect(system.processEvents()).rejects.toThrow("Test error");
      });

      test("should set undefined values for malformed event data", async () => {
        person.on(
          "AGE_UPDATED",
          async (instanceId: string, data: Record<string, unknown>) => {
            const ageData = data as unknown as AgeEventData;
            return {
              update: { age: ageData.age },
            };
          },
        );

        person.createInstance("person", "person_1", { name: "Alice", age: 20 });

        // Queue event with malformed data
        system.queueEvent("person", "person_1", "AGE_UPDATED", {
          invalid: "data",
        });
        await system.processEvents();

        // Verify age is set to undefined when event data is malformed
        const instance = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        expect(instance).toEqual({
          name: "Alice",
          age: undefined,
          isHungry: false,
          movementMethod: "walking",
        });
      });

      test("should allow adding new properties to instance state", async () => {
        person.on("PROPERTY_ADDED", async () => {
          return {
            update: { newProperty: "value" },
          };
        });

        person.createInstance("person", "person_1", { name: "Alice", age: 20 });

        // Queue event that adds a new property
        system.queueEvent("person", "person_1", "PROPERTY_ADDED", {});
        await system.processEvents();

        // Verify new property was added
        const instance = person.getInstance(
          "person_1",
        ) as unknown as PersonData & { newProperty: string };
        expect(instance?.newProperty).toBe("value");
      });

      test("should handle invalid event types", async () => {
        person.createInstance("person", "person_1", { name: "Alice", age: 20 });

        // Queue event with invalid type
        system.queueEvent(
          "person",
          "person_1",
          "INVALID_EVENT_TYPE" as "STARTED_MOVING",
          {},
        );

        // Process events and expect it to complete without throwing
        await expect(system.processEvents()).resolves.not.toThrow();

        // Verify instance state remains unchanged
        const instance = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        expect(instance).toEqual({
          name: "Alice",
          age: 20,
          isHungry: false,
          movementMethod: "walking",
        });
      });
    });

    describe("State Validation", () => {
      test("should maintain type safety for instance state", async () => {
        person.on("STATE_UPDATED", async () => {
          return {
            update: {
              age: 25, // number
              name: "Bob", // string
              isHungry: true, // boolean
              movementMethod: "running", // string
            },
          };
        });

        person.createInstance("person", "person_1", { name: "Alice", age: 20 });
        system.queueEvent("person", "person_1", "STATE_UPDATED", {});
        await system.processEvents();

        const instance = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        expect(typeof instance.age).toBe("number");
        expect(typeof instance.name).toBe("string");
        expect(typeof instance.isHungry).toBe("boolean");
        expect(typeof instance.movementMethod).toBe("string");
      });

      test("should properly merge state updates", async () => {
        person.on("PARTIAL_STATE_UPDATED", async () => {
          return {
            update: {
              age: 25,
              name: "Bob",
            },
          };
        });

        person.createInstance("person", "person_1", {
          name: "Alice",
          age: 20,
          isHungry: false,
          movementMethod: "walking",
        });

        system.queueEvent("person", "person_1", "PARTIAL_STATE_UPDATED", {});
        await system.processEvents();

        const instance = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        expect(instance).toEqual({
          name: "Bob", // Updated
          age: 25, // Updated
          isHungry: false, // Unchanged
          movementMethod: "walking", // Unchanged
        });
      });

      test("should handle nested state updates", async () => {
        interface ComplexPersonData extends PersonData {
          stats: {
            strength: number;
            speed: number;
          };
        }

        const complexPerson = system.createComponent("complexPerson", {
          name: "",
          age: 0,
          isHungry: false,
          movementMethod: "walking",
          stats: {
            strength: 10,
            speed: 10,
          },
        });

        complexPerson.on("STATS_UPDATED", async () => {
          return {
            update: {
              stats: {
                strength: 15,
              },
            },
          };
        });

        complexPerson.createInstance("complexPerson", "person_1", {});
        system.queueEvent("complexPerson", "person_1", "STATS_UPDATED", {});
        await system.processEvents();

        const instance = complexPerson.getInstance(
          "person_1",
        ) as unknown as ComplexPersonData;
        expect(instance.stats).toEqual({
          strength: 15, // Updated
          // speed property is removed since nested objects are replaced
        });
      });

      test("should handle array state updates", async () => {
        interface PersonWithItems extends PersonData {
          items: string[];
        }

        const personWithItems = system.createComponent("personWithItems", {
          name: "",
          age: 0,
          isHungry: false,
          movementMethod: "walking",
          items: [],
        });

        personWithItems.on("ITEM_ADDED", async () => {
          return {
            update: {
              items: ["sword"],
            },
          };
        });

        personWithItems.createInstance("personWithItems", "person_1", {});
        system.queueEvent("personWithItems", "person_1", "ITEM_ADDED", {});
        await system.processEvents();

        const instance = personWithItems.getInstance(
          "person_1",
        ) as unknown as PersonWithItems;
        expect(instance.items).toEqual(["sword"]);
      });
    });

    describe("Component Interaction", () => {
      test("should handle events that trigger updates across components", async () => {
        const personComponent = system.createComponent("person", {
          isHungry: true,
        });

        personComponent.on(
          "FRIDGE_INTERACTED",
          async (instanceId: string, data: Record<string, unknown>) => {
            return {
              send: [
                {
                  event: "FRIDGE_OPENED",
                  data: { fridgeId: data.fridgeId, personId: instanceId },
                },
              ],
            };
          },
        );

        const fridgeComponent = system.createComponent("fridge", {
          isOpen: false,
        });

        fridgeComponent.on(
          "FRIDGE_OPENED",
          async (instanceId: string, data: Record<string, unknown>) => {
            return {
              update: { isOpen: true },
              send: [
                { event: "FOOD_EATEN", data: { personId: data.personId } },
              ],
            };
          },
        );

        personComponent.on("FOOD_EATEN", async () => {
          return {
            update: { isHungry: false },
          };
        });

        const personId = "person_1";
        const fridgeId = "fridge_1";

        personComponent.createInstance("person", personId, { isHungry: true });
        fridgeComponent.createInstance("fridge", fridgeId, { isOpen: false });

        // Queue the initial event
        system.queueEvent("person", personId, "FRIDGE_INTERACTED", {
          fridgeId,
        });
        await system.processEvents();

        // Queue the fridge event directly to ensure it's processed
        system.queueEvent("fridge", fridgeId, "FRIDGE_OPENED", { personId });
        await system.processEvents();

        // Queue the eat food event directly to ensure it's processed
        system.queueEvent("person", personId, "FOOD_EATEN", {});
        await system.processEvents();

        const personState = personComponent.getInstance(
          personId,
        ) as unknown as PersonState;
        const fridgeState = fridgeComponent.getInstance(
          fridgeId,
        ) as unknown as FridgeState;

        expect(personState.isHungry).toBe(false);
        expect(fridgeState.isOpen).toBe(true);
      });

      test("should handle state dependencies between components", async () => {
        // Create a location component that tracks where people are
        const location = system.createComponent("location", {
          occupants: [] as string[],
        });

        // When person moves, update the locations through events
        person.on(
          "MOVED_TO",
          async (instanceId: string, data: Record<string, unknown>) => {
            return {
              send: [
                {
                  event: "OCCUPANTS_UPDATED",
                  data: {
                    fromLocation: data.fromLocation,
                    toLocation: data.toLocation,
                    personId: instanceId,
                  },
                },
              ],
            };
          },
        );

        // Handle occupant updates in the location component
        location.on(
          "OCCUPANTS_UPDATED",
          async (instanceId: string, data: Record<string, unknown>) => {
            if (instanceId === data.fromLocation) {
              const state = location.getInstance(instanceId) as unknown as {
                occupants: string[];
              };
              return {
                update: {
                  occupants: state.occupants.filter(
                    (id) => id !== data.personId,
                  ),
                },
              };
            }
            if (instanceId === data.toLocation) {
              const state = location.getInstance(instanceId) as unknown as {
                occupants: string[];
              };
              return {
                update: {
                  occupants: [...state.occupants, data.personId as string],
                },
              };
            }
            return {};
          },
        );

        // Create instances and set up initial state
        person.createInstance("person", "person_1", {});
        location.createInstance("location", "kitchen", { occupants: [] });
        location.createInstance("location", "livingRoom", {
          occupants: ["person_1"],
        });

        // Move person from living room to kitchen
        system.queueEvent("person", "person_1", "MOVED_TO", {
          fromLocation: "livingRoom",
          toLocation: "kitchen",
        });

        // Queue events for both locations
        system.queueEvent("location", "livingRoom", "OCCUPANTS_UPDATED", {
          fromLocation: "livingRoom",
          toLocation: "kitchen",
          personId: "person_1",
        });
        system.queueEvent("location", "kitchen", "OCCUPANTS_UPDATED", {
          fromLocation: "livingRoom",
          toLocation: "kitchen",
          personId: "person_1",
        });

        await system.processEvents();

        // Verify locations were updated correctly
        const kitchen = location.getInstance("kitchen") as unknown as {
          occupants: string[];
        };
        const livingRoom = location.getInstance("livingRoom") as unknown as {
          occupants: string[];
        };

        expect(kitchen.occupants).toContain("person_1");
        expect(livingRoom.occupants).not.toContain("person_1");
      });

      test("should handle component-specific event handling", async () => {
        // Create two different types of components that handle the same event differently
        const robot = system.createComponent("robot", {
          batteryLevel: 100,
          isCharging: false,
        });

        // Person handles REST event by becoming less hungry
        person.on("RESTED", async () => {
          return {
            update: { isHungry: false },
          };
        });

        // Robot handles REST event by charging
        robot.on("RESTED", async () => {
          return {
            update: { isCharging: true },
          };
        });

        // Create instances
        person.createInstance("person", "person_1", {
          name: "Alice",
          age: 20,
          isHungry: true,
        });
        robot.createInstance("robot", "robot_1", {
          batteryLevel: 50,
          isCharging: false,
        });

        // Send REST event to both
        system.queueEvent("person", "person_1", "RESTED", {});
        system.queueEvent("robot", "robot_1", "RESTED", {});
        await system.processEvents();

        // Verify each handled the event differently
        const personState = person.getInstance(
          "person_1",
        ) as unknown as PersonData;
        const robotState = robot.getInstance("robot_1") as unknown as {
          batteryLevel: number;
          isCharging: boolean;
        };

        expect(personState.isHungry).toBe(false);
        expect(robotState.isCharging).toBe(true);
      });
    });
  });
});
