export type GlobalComponent = "system";
export type GlobalEvent = "SYSTEM_INITIALIZED";

export type BaseSystemComponent<T> = T | GlobalComponent;

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
  T extends BaseSystemEvent<string>,
  S extends Record<T, unknown>,
> = {
  [K in T]: S[K];
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
  ED extends BaseSystemEventDataModel<SE, Record<SE, unknown>>,
> = {
  [K in Exclude<T, GlobalComponent>]: {
    data: CD[K];
    events: {
      [E in keyof ED]?: {
        action: (data: ED[E], system: SD) => Promise<SU>;
        send: Array<
          {
            [S in SE]: {
              event: S;
              data: ED[S];
            };
          }[SE]
        >;
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
  ED extends BaseSystemEventDataModel<SE, Record<SE, unknown>>,
> = {
  state: BS;
  queue: Array<{
    event: SE;
    data: ED[SE];
  }>;
  processEvent: (event: SE, data: ED[SE]) => Promise<void>;
  applyUpdate: (update: SU) => void;
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
  ED extends BaseSystemEventDataModel<SE, Record<SE, unknown>>,
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

  const manager: BaseSystemManager<BS, T, CD, SE, SU, SD, ED> = {
    state: initialState,
    queue: [],

    async processEvent(event, data) {
      try {
        // Add event to queue
        this.queue.push({ event, data });

        // Process queue
        while (this.queue.length > 0) {
          const current = this.queue.shift()!;
          const componentKey = Object.keys(this.state)[0] as keyof BS;
          const component = this.state[componentKey];

          // Find and execute the action
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
                console.error(
                  `Error processing event ${current.event}:`,
                  error.message,
                );
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error in processEvent:", error.message);
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

            // Create new data by merging current and changes
            const newData = Object.assign(
              {},
              currentData,
              changesData,
            ) as CD[Exclude<T, GlobalComponent>];

            stateComponent.data = newData;
          }
        }
      });
    },
  };

  return manager;
}
