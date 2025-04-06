export type GlobalComponent = "system";
export type GlobalEvent = "SYSTEM_INITIALIZED";

export type BaseSystemComponent<T> = T | GlobalComponent;

export type ComponentInstanceId<T extends string> = {
  [K in Exclude<T, "system">]: `${K}_${string}`;
}[Exclude<T, "system">];

export function createInstanceId<T extends string>(
  component: T,
  id: string,
): `${T}_${string}` {
  return `${component}_${id}`;
}

// Component-specific instance IDs
// type ComponentInstanceId = {
//   internalDev: `internalDev_${string}`;
//   endUser: `endUser_${string}`;
//   externalDev: `externalDev_${string}`;
//   button: `button_${string}`;
//   deployment: `deployment_${string}`;
// }[SystemComponent];
// export type ComponentInstanceId = string; // Generic identifier for any component instance

// Property types to distinguish between stateful and immutable properties
export type StatefulProperty<T> = {
  type: "stateful";
  value: T;
};

export type ImmutableProperty<T> = {
  type: "immutable";
  value: T;
};

// Helper type to create a property
export type Property<T> = StatefulProperty<T> | ImmutableProperty<T>;

export type BaseSystemComponentDataModel<
  T extends BaseSystemComponent<string>,
  S extends Record<Exclude<T, GlobalComponent>, unknown>,
> = {
  [K in Exclude<T, GlobalComponent>]: S[K];
};

export type BaseSystemEvent<T> = T | GlobalEvent;

export type BaseSystemEventDataModel<
  T extends string,
  U extends Record<T, Record<string, unknown>>,
> = {
  [K in T]: K extends keyof U ? U[K] : Record<string, never>;
};

export type BaseSystemData<
  T extends BaseSystemComponent<string>,
  D extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
> = {
  [K in Exclude<T, GlobalComponent>]: {
    data: D[K];
  };
};

export type BaseSystemUpdate<
  T extends BaseSystemComponent<string>,
  D extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
> = {
  [K in Exclude<T, GlobalComponent>]?: {
    data: Partial<D[K]>;
  };
};

export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type BaseSystem<
  T extends BaseSystemComponent<string>,
  CD extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
  SE extends BaseSystemEvent<string>,
  SD extends BaseSystemData<T, CD>,
  SU extends BaseSystemUpdate<T, CD>,
  ED extends BaseSystemEventDataModel<SE, Record<SE, Record<string, unknown>>>,
> = {
  [K in Exclude<T, GlobalComponent>]: {
    data: CD[K];
    events: {
      [E in SE]?: {
        action: (data: ED[E], system: SD) => Promise<SU>;
        send: Array<{ event: SE; data: ED[SE] }>;
      };
    };
  };
};

// Helper type to ensure action return values match the component data model
export type ActionReturnType<
  T extends BaseSystemComponent<string>,
  CD extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
> = {
  [K in Exclude<T, GlobalComponent>]?: {
    data: Partial<CD[K]>;
  };
};

export type BaseSystemManager<
  BS extends BaseSystem<T, CD, SE, SD, SU, ED>,
  T extends BaseSystemComponent<string>,
  CD extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
  SE extends BaseSystemEvent<string>,
  SU extends BaseSystemUpdate<T, CD>,
  SD extends BaseSystemData<T, CD>,
  ED extends BaseSystemEventDataModel<SE, Record<SE, Record<string, unknown>>>,
> = {
  state: BS;
  queue: Array<{
    event: SE;
    data: ED[SE];
  }>;
  processEvent: (event: SE, data: ED[SE]) => Promise<void>;
  applyUpdate: (update: SU) => void;
  resetInstanceIds: () => void;
};

export function createSystemManager<
  BS extends BaseSystem<T, CD, SE, SD, SU, ED>,
  T extends BaseSystemComponent<string>,
  CD extends BaseSystemComponentDataModel<
    T,
    Record<Exclude<T, GlobalComponent>, unknown>
  >,
  SE extends BaseSystemEvent<string>,
  SU extends BaseSystemUpdate<T, CD>,
  SD extends BaseSystemData<T, CD>,
  ED extends BaseSystemEventDataModel<SE, Record<SE, Record<string, unknown>>>,
>(initialState: BS): BaseSystemManager<BS, T, CD, SE, SU, SD, ED> {
  // Type guard for component data
  function isValidComponentData(
    value: unknown,
  ): value is { data: CD[Exclude<T, GlobalComponent>] } {
    return (
      typeof value === "object" &&
      value !== null &&
      "data" in value &&
      typeof (value as { data: unknown }).data === "object" &&
      (value as { data: unknown }).data !== null
    );
  }

  // Type guard for update changes
  function isValidUpdateChanges(
    value: unknown,
  ): value is { data: Partial<CD[Exclude<T, GlobalComponent>]> } {
    return (
      typeof value === "object" &&
      value !== null &&
      "data" in value &&
      typeof (value as { data: unknown }).data === "object" &&
      (value as { data: unknown }).data !== null
    );
  }

  // Track used instance IDs
  const usedInstanceIds = new Set<string>();

  const manager: BaseSystemManager<BS, T, CD, SE, SU, SD, ED> = {
    state: initialState,
    queue: [],

    resetInstanceIds() {
      usedInstanceIds.clear();
    },

    async processEvent(event, data) {
      try {
        // Validate instance ID if present
        if ("instanceId" in data) {
          const instanceId = data.instanceId as string;
          const [component = ""] = instanceId.split("_");

          // Check for duplicate instance ID
          if (usedInstanceIds.has(instanceId)) {
            throw new Error(`Duplicate instance ID: ${instanceId}`);
          }

          // Type guard to check if a component has the event handler
          const hasEventHandler = (
            componentData: unknown,
          ): componentData is { events: Record<SE, { action?: unknown }> } => {
            return (
              !!componentData &&
              typeof componentData === "object" &&
              "events" in componentData &&
              event in
                (componentData as { events: Record<SE, unknown> }).events &&
              !!(componentData as { events: Record<SE, { action?: unknown }> })
                .events[event]?.action
            );
          };

          // Find all components that handle this event
          const handlingComponents = Object.keys(this.state).filter((name) =>
            hasEventHandler(this.state[name as keyof BS]),
          );

          // Check if the component from instanceId is one of the handlers
          if (
            handlingComponents.length > 0 &&
            !handlingComponents.includes(component)
          ) {
            throw new Error(
              `Invalid instance ID: ${instanceId} for event ${event}. ` +
                `Event can only be handled by: ${handlingComponents.join(", ")}`,
            );
          }

          // Add the instance ID to the used set
          usedInstanceIds.add(instanceId);
        }

        // Add event to queue
        this.queue.push({ event, data });

        // Process queue
        while (this.queue.length > 0) {
          const current = this.queue.shift()!;

          // Check all components for the event handler
          for (const componentKey of Object.keys(this.state) as Array<
            keyof BS
          >) {
            const component = this.state[componentKey];
            const action = component.events[current.event];
            if (action) {
              try {
                // Execute action and get updates
                const updates = await action.action(
                  data,
                  this.state as unknown as SD,
                );

                // Apply updates atomically
                if (updates) {
                  this.applyUpdate(updates);
                }

                // Process any new events from the action
                if (action.send) {
                  for (const send of action.send) {
                    this.queue.push(send);
                  }
                }
              } catch (error) {
                if (error instanceof Error) {
                  throw error; // Re-throw the error instead of just logging it
                }
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error in processEvent:", error.message);
          throw error; // Re-throw the error after logging it
        }
      }
    },

    applyUpdate(update) {
      // Apply updates atomically
      Object.entries(update).forEach(([component, changes]) => {
        if (isValidUpdateChanges(changes)) {
          const stateComponent = this.state[component as keyof BS];
          if (isValidComponentData(stateComponent)) {
            const currentData = stateComponent.data;
            const changesData = changes.data;

            // Create new data by merging current and changes, preserving property types
            const newData = {} as CD[Exclude<T, GlobalComponent>];
            const currentDataObj = currentData as Record<string, unknown>;
            const changesDataObj = changesData as Record<string, unknown>;
            for (const key in currentDataObj) {
              if (key in changesDataObj) {
                (newData as Record<string, unknown>)[key] = changesDataObj[key];
              } else {
                (newData as Record<string, unknown>)[key] = currentDataObj[key];
              }
            }

            stateComponent.data = newData;
          }
        }
      });
    },
  };

  return manager;
}

export abstract class BaseSystemImpl<
  C extends string,
  E extends string,
  CD extends Record<C, { id: string }>,
  ED extends Record<E, { instanceId?: string }>,
> {
  protected components: Map<C, Map<string, CD[C]>>;
  protected events: E[];
  protected eventHandlers: Map<E, ((data: ED[E]) => void)[]>;

  constructor() {
    this.components = new Map();
    this.events = [];
    this.eventHandlers = new Map();
    this.initializeComponents();
    this.initializeEvents();
  }

  protected abstract initializeComponents(): void;
  protected abstract initializeEvents(): void;

  protected createComponent<K extends C>(
    type: K,
    id: string,
    data: Omit<CD[K], "id">,
  ): CD[K] {
    if (!this.components.has(type)) {
      this.components.set(type, new Map());
    }
    const component = { ...data, id } as CD[K];
    this.components.get(type)!.set(id, component);
    return component;
  }

  protected getComponent<K extends C>(type: K, id: string): CD[K] | undefined {
    return this.components.get(type)?.get(id) as CD[K] | undefined;
  }

  protected emit<K extends E>(
    event: K,
    data: ED[K] extends { instanceId: string }
      ? ED[K]
      : Omit<ED[K], "instanceId">,
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data as ED[K]));
    }
  }

  protected on<K extends E>(event: K, handler: (data: ED[K]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler as (data: ED[E]) => void);
  }
}
