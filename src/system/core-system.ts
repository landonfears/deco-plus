// Core system types
type ComponentName = string;
type InstanceId = string;
type EventName = string;

// Base types for component data and event data
type ComponentData = Record<string, unknown> & {
  parentInstanceId?: string;
  childInstanceIds?: string[];
};
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
  private name: string;
  private dataModel: ComponentData;
  private parent?: ComponentName;
  private children: ComponentName[] = [];
  private system: System;

  constructor(name: string, dataModel: ComponentData, system: System) {
    this.name = name;
    this.dataModel = dataModel;
    this.system = system;
  }

  // Add getter for name
  getName(): string {
    return this.name;
  }

  // Add methods for parent-child relationships
  setParent(parent: ComponentName): void {
    this.parent = parent;
  }

  addChild(child: ComponentName): void {
    if (!this.children.includes(child)) {
      this.children.push(child);
    }
  }

  getParent(): Component | undefined {
    return this.parent ? this.system.getComponent(this.parent) : undefined;
  }

  getChildren(): Component[] {
    return this.children
      .map((childName) => this.system.getComponent(childName))
      .filter((child): child is Component => child !== undefined);
  }

  // Add shouldPropagateToParent method
  protected shouldPropagateToParent(event: EventName): boolean {
    // List of events that should not propagate to parent
    const nonPropagatingEvents = ["init", "destroy", "update", "childUpdate"];
    return !nonPropagatingEvents.includes(event);
  }

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

  // Modify createInstance to handle child instances
  createInstance(
    componentId: ComponentName,
    instanceId: InstanceId,
    data: ComponentData = {},
  ): void {
    const component = this.system.getComponent(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not found`);
    }

    // Create instance with merged data from component model and provided data
    const instanceData = {
      ...component.dataModel, // Start with the component's data model
      ...data, // Override with provided data
    };

    // Set the instance
    component.instances.set(instanceId, instanceData);

    // If this component has a parent, establish relationship
    if (component.parent) {
      const parentComponent = this.system.getComponent(component.parent);
      if (parentComponent) {
        // Extract base instance ID (e.g., "child_1" -> "1")
        const baseInstanceId = instanceId.split("_").pop() ?? "";
        const parentInstanceId = `${component.parent}_${baseInstanceId}`;

        // Create parent instance if it doesn't exist
        if (!parentComponent.instances.has(parentInstanceId)) {
          parentComponent.createInstance(
            component.parent,
            parentInstanceId,
            {},
          );
        }

        // Link this instance to parent
        instanceData.parentInstanceId = parentInstanceId;

        // Update parent instance's child list
        const parentInstance = parentComponent.instances.get(parentInstanceId);
        if (parentInstance) {
          parentInstance.childInstanceIds ??= [];
          if (!parentInstance.childInstanceIds.includes(instanceId)) {
            parentInstance.childInstanceIds.push(instanceId);
          }
        }
      }
    }

    // Create instances for all child components
    for (const childId of component.children) {
      const childComponent = this.system.getComponent(childId);
      if (childComponent) {
        // Create child instance with same base ID
        const baseInstanceId = instanceId.split("_").pop() ?? "";
        const childInstanceId = `${childId}_${baseInstanceId}`;

        if (!childComponent.instances.has(childInstanceId)) {
          childComponent.createInstance(childId, childInstanceId, {
            parentInstanceId: instanceId,
          });
        }

        // Update this instance's child list
        instanceData.childInstanceIds ??= [];
        if (!instanceData.childInstanceIds.includes(childInstanceId)) {
          instanceData.childInstanceIds.push(childInstanceId);
        }
      }
    }
  }

  // Get instance data
  getInstance(instanceId: InstanceId): ComponentData | undefined {
    return this.instances.get(instanceId);
  }

  // Register an event handler
  on(event: EventName, handler: EventHandler): void {
    this.eventHandlers.set(event, handler);
  }

  // Modify processEvent to handle event propagation
  async processEvent(
    instanceId: InstanceId,
    event: EventName,
    data: EventData,
  ): Promise<EventObject[]> {
    this.logSystemState(event, instanceId, data);

    const instance = this.instances.get(instanceId);
    if (!instance) {
      console.warn(`[COMPONENT ${this.name}] Instance ${instanceId} not found`);
      return [];
    }

    const handler = this.eventHandlers.get(event);
    if (!handler) {
      console.warn(`[COMPONENT ${this.name}] No handler for event ${event}`);
      return [];
    }

    try {
      // Process event locally
      const result = await handler(instanceId, data, this);

      // Update local instance if needed
      if (result.update) {
        this.updateInstance(instanceId, result.update);
        console.log(
          `[COMPONENT ${this.name}] Applied update to ${instanceId}:`,
          result.update,
        );
      }

      // Prepare events to send
      let eventsToSend = result.send ?? [];

      // Propagate to parent by default unless explicitly prevented by an empty send array
      if (
        this.parent &&
        result.send === undefined &&
        this.shouldPropagateToParent(event)
      ) {
        const parentComponent = this.getParent();
        if (parentComponent) {
          const parentInstanceId = instance.parentInstanceId;
          if (parentInstanceId) {
            const parentResult = await parentComponent.processEvent(
              parentInstanceId,
              event,
              data,
            );
            eventsToSend = [...eventsToSend, ...parentResult];
          }
        }
      }

      return eventsToSend;
    } catch (error) {
      console.error(
        `[COMPONENT ${this.name}] Error processing event ${event}:`,
        error,
      );
      throw error;
    }
  }

  updateInstance(instanceId: InstanceId, update: Partial<ComponentData>): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    Object.assign(instance, update);
  }

  clearInstances(): void {
    this.instances.clear();
  }

  getEventHandler(eventName: EventName): EventHandler | undefined {
    return this.eventHandlers.get(eventName);
  }

  // Add method to get all registered event names
  getRegisteredEventNames(): EventName[] {
    return Array.from(this.eventHandlers.keys());
  }

  getInstanceCount(): number {
    return this.instances.size;
  }

  getInstanceIds(): InstanceId[] {
    return Array.from(this.instances.keys());
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

  // Create a new component with optional parent
  createComponent(
    name: ComponentName,
    dataModel: ComponentData,
    parent?: ComponentName,
  ): Component {
    const component = new Component(name, dataModel, this);
    this.components.set(name, component);

    if (parent) {
      const parentComponent = this.getComponent(parent);
      if (parentComponent) {
        component.setParent(parent);
        parentComponent.addChild(name);
      }
    }

    return component;
  }

  // Create a component and its children in one call
  createComponentWithChildren(
    name: ComponentName,
    dataModel: ComponentData,
    children: Array<{
      name: ComponentName;
      dataModel: ComponentData;
    }>,
  ): Component {
    const parent = this.createComponent(name, dataModel);

    children.forEach((child) => {
      this.createComponent(child.name, child.dataModel, name);
    });

    return parent;
  }

  // Get all descendants of a component
  getDescendants(componentName: ComponentName): Component[] {
    const component = this.getComponent(componentName);
    if (!component) return [];

    const descendants: Component[] = [];
    const queue = [...component.getChildren()];

    while (queue.length > 0) {
      const current = queue.shift()!;
      descendants.push(current);
      queue.push(...current.getChildren());
    }

    return descendants;
  }

  // Get all ancestors of a component
  getAncestors(componentName: ComponentName): Component[] {
    const component = this.getComponent(componentName);
    if (!component) return [];

    const ancestors: Component[] = [];
    let current = component.getParent();

    while (current) {
      ancestors.push(current);
      current = current.getParent();
    }

    return ancestors;
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
    console.log("queueEvent", component, instanceId, event, data);
    this.eventQueue.push({ component, instanceId, event, data });
  }

  // Process all queued events
  async processEvents(): Promise<void> {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (!event) continue;

      const { component, instanceId, event: eventName, data } = event;
      console.log(`[CORE] Processing event:`, {
        component,
        instanceId,
        event: eventName,
        data,
      });

      const comp = this.getComponent(component);
      if (!comp) {
        console.warn(`[CORE] Component ${component} not found`);
        continue;
      }

      const handler = comp.getEventHandler(eventName);
      if (!handler) {
        console.warn(
          `[CORE] No handler for event ${eventName} in component ${component}`,
        );
        continue;
      }

      try {
        const result = await handler(instanceId, data, comp);
        if (result.update) {
          const instance = comp.getInstance(instanceId);
          if (!instance) {
            console.warn(
              `[CORE] Instance ${instanceId} not found in component ${component}`,
            );
            continue;
          }
          comp.updateInstance(instanceId, result.update);
          console.log(
            `[CORE] Applied update to ${component}.${instanceId}:`,
            result.update,
          );
        }
        if (result.send) {
          for (const newEvent of result.send) {
            const targetComponent = newEvent.component ?? component;
            const targetInstanceId =
              "instanceId" in newEvent.data
                ? (newEvent.data.instanceId as string)
                : instanceId;
            console.log(`[CORE] Queueing new event:`, {
              component: targetComponent,
              instanceId: targetInstanceId,
              event: newEvent.event,
              data: newEvent.data,
            });
            this.queueEvent(
              targetComponent,
              targetInstanceId,
              newEvent.event,
              newEvent.data,
            );
          }
        }
      } catch (error) {
        console.error(`[CORE] Error processing event:`, error);
        throw error;
      }
    }
  }

  getComponents(): Component[] {
    return Array.from(this.components.values());
  }

  broadcastEvent(
    componentName: ComponentName,
    event: EventName,
    data: EventData,
  ): void {
    const component = this.getComponent(componentName);
    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    // Get all instance IDs for this component
    const instanceIds = component.getInstanceIds();

    // Queue the event for each instance
    for (const instanceId of instanceIds) {
      this.queueEvent(componentName, instanceId, event, data);
    }
  }
}

export const getSystemEvents = (system: System): EventName[] => {
  const events = new Set<EventName>();
  const components = system.getComponents();

  // Collect all registered event names from each component
  components.forEach((component) => {
    component.getRegisteredEventNames().forEach((eventName) => {
      events.add(eventName);
    });
  });

  return Array.from(events);
};

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
