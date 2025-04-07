// Core system types
type ComponentName = string;
type InstanceId = string;
type EventName = string;

// Base types for component data and event data
type ComponentData = Record<string, unknown>;
// Event names should follow a past tense verb format to indicate "something happened"
type EventData = Record<string, unknown>;

// Event handler type that can update component data and send new events
type EventHandler = (
  instanceId: InstanceId,
  data: EventData,
  component: Component,
) => Promise<{
  update?: Partial<ComponentData>;
  send?: Array<{
    component?: ComponentName;
    event: EventName;
    data: EventData;
  }>;
}>;

// Event object type that can be either the old format or new format
type EventObject =
  | { event: EventName; data: EventData }
  | { component?: ComponentName; event: EventName; data: EventData };

// Component class that manages instances and events
export class Component {
  private instances: Map<InstanceId, ComponentData> = new Map<
    InstanceId,
    ComponentData
  >();
  private eventHandlers: Map<EventName, EventHandler> = new Map<
    EventName,
    EventHandler
  >();

  constructor(
    public readonly name: ComponentName,
    private readonly dataModel: ComponentData,
  ) {}

  // Logging utility
  private logSystemState(
    event: EventName,
    instanceId: InstanceId,
    data: EventData,
  ): void {
    console.log("\n=== System State Log ===");
    console.log(`Component: ${this.name}`);
    console.log(`Event: ${event}`);
    console.log(`Instance ID: ${instanceId}`);

    // Log event data if it exists
    if (data && Object.keys(data).length > 0) {
      console.log("\nEvent Data:", data);
    } else {
      console.log("\nEvent Data: (empty)");
    }

    // Log instance data if it exists
    const instance = this.getInstance(instanceId);
    if (instance) {
      console.log("\nInstance Data:", instance);
    } else {
      console.log("\nInstance Data: (not found)");
    }

    // Log all instances for this component
    console.log(
      "\nAll Instances in Component:",
      Array.from(this.instances.entries()),
    );
    console.log("=====================\n");
  }

  // Create a new instance with initial data
  createInstance(
    instanceId: InstanceId,
    initialData: Partial<ComponentData> = {},
  ): void {
    this.instances.set(instanceId, {
      ...this.dataModel,
      ...initialData,
    });
  }

  // Get instance data
  getInstance(instanceId: InstanceId): ComponentData | undefined {
    return this.instances.get(instanceId);
  }

  // Register an event handler
  on(event: EventName, handler: EventHandler): void {
    this.eventHandlers.set(event, handler);
  }

  // Process an event for a specific instance
  async processEvent(
    instanceId: InstanceId,
    event: EventName,
    data: EventData,
  ): Promise<EventObject[]> {
    // Log the system state before processing
    // this.logSystemState(event, instanceId, data);

    const instance = this.instances.get(instanceId);
    if (!instance) {
      console.warn(
        `Instance ${instanceId} not found in component ${this.name}`,
      );
      return [];
    }

    const handler = this.eventHandlers.get(event);
    if (!handler) {
      console.warn(`No handler for event ${event} in component ${this.name}`);
      return [];
    }

    try {
      const result = await handler(instanceId, data, this);
      if (result.update) {
        this.updateInstance(instanceId, result.update);
        // Log the update
        console.log(
          `\nApplied update to ${this.name}.${instanceId}:`,
          result.update,
        );
      }
      return result.send ?? [];
    } catch (error) {
      console.error(
        `Error processing event ${event} in component ${this.name}:`,
        error,
      );
      throw error;
    }
  }

  private updateInstance(
    instanceId: InstanceId,
    update: Partial<ComponentData>,
  ): void {
    const currentData = this.instances.get(instanceId);
    if (currentData) {
      this.instances.set(instanceId, {
        ...currentData,
        ...update,
      });
    }
  }
}

// System class that manages components and event processing
export class System {
  private components: Map<ComponentName, Component> = new Map<
    ComponentName,
    Component
  >();
  private eventQueue: Array<{
    component: ComponentName;
    instanceId: InstanceId;
    event: EventName;
    data: EventData;
  }> = [];

  constructor() {
    // Create the global/system component
    this.createComponent("system", {});
  }

  // Create a new component
  createComponent(name: ComponentName, dataModel: ComponentData): Component {
    const component = new Component(name, dataModel);
    this.components.set(name, component);
    return component;
  }

  // Get a component
  getComponent(name: ComponentName): Component | undefined {
    return this.components.get(name);
  }

  // Queue an event for processing
  queueEvent(
    component: ComponentName,
    instanceId: InstanceId,
    event: EventName,
    data: EventData,
  ): void {
    this.eventQueue.push({ component, instanceId, event, data });
  }

  // Process all queued events
  async processEvents(): Promise<void> {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (!event) continue;

      const { component, instanceId, event: eventName, data } = event;
      const comp = this.getComponent(component);

      if (comp) {
        const newEvents = await comp.processEvent(instanceId, eventName, data);

        // Queue any new events that were generated
        for (const newEvent of newEvents) {
          // Handle both old format (without component) and new format (with component)
          const targetComponent =
            "component" in newEvent ? newEvent.component : component;
          const targetInstanceId =
            "instanceId" in newEvent.data
              ? (newEvent.data.instanceId as string)
              : instanceId;

          this.queueEvent(
            targetComponent ?? component,
            targetInstanceId,
            newEvent.event,
            newEvent.data,
          );
        }
      }
    }
  }
}

// // Example usage:
// const system = new System();

// // Create a person component
// const person = system.createComponent("person", {
//   name: "",
//   age: 0,
//   isHungry: false,
// });

// // Register event handlers
// person.on("FELT_HUNGER", async (instanceId, data, component) => {
//   const instance = component.getInstance(instanceId);
//   if (!instance) return {};

//   return {
//     update: { isHungry: true },
//     send: [{ event: "STARTED_MOVING", data: { movementMethod: "walking" } }],
//   };
// });

// // Create an instance
// person.createInstance("person_1", { name: "Alice", age: 30 });

// // Queue an event
// system.queueEvent("person", "person_1", "FELT_HUNGER", {});

// // Process events
// await system.processEvents();
