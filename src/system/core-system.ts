// Core system types
type ComponentName = string;
type InstanceId = string;
type EventName = string;

// Base types for component data and event data
type ComponentData = Record<string, unknown>;
type EventData = Record<string, unknown>;

// Event handler type that can update component data and send new events
type EventHandler = (
  instanceId: InstanceId,
  data: EventData,
  component: Component,
) => Promise<{
  update?: Partial<ComponentData>;
  send?: Array<{ event: EventName; data: EventData }>;
}>;

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
  ): Promise<Array<{ event: EventName; data: EventData }>> {
    const handler = this.eventHandlers.get(event);
    if (!handler) {
      return [];
    }

    const result = await handler(instanceId, data, this);

    // Update instance data if provided
    if (result.update) {
      const currentData = this.instances.get(instanceId);
      if (currentData) {
        this.instances.set(instanceId, {
          ...currentData,
          ...result.update,
        });
      }
    }

    // Return any events to be sent
    return result.send ?? [];
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
          this.queueEvent(component, instanceId, newEvent.event, newEvent.data);
        }
      }
    }
  }
}

// Example usage:
const system = new System();

// Create a person component
const person = system.createComponent("person", {
  name: "",
  age: 0,
  isHungry: false,
});

// Register event handlers
person.on("FELT_HUNGER", async (instanceId, data, component) => {
  const instance = component.getInstance(instanceId);
  if (!instance) return {};

  return {
    update: { isHungry: true },
    send: [{ event: "STARTED_MOVING", data: { movementMethod: "walking" } }],
  };
});

// Create an instance
person.createInstance("person_1", { name: "Alice", age: 30 });

// Queue an event
system.queueEvent("person", "person_1", "FELT_HUNGER", {});

// Process events
await system.processEvents();
