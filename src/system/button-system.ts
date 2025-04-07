import { System, Component } from "./core-system";

// Types
export type ButtonSize = "small" | "medium" | "large";
export type ButtonColor = "primary" | "secondary" | "success" | "danger";

// Data interfaces
export interface ButtonData {
  id: string;
  count: number;
  size: ButtonSize;
  color: ButtonColor;
  isDeployed: boolean;
}

export interface InternalDevData {
  id: string;
  isTesting: boolean;
  isDeploying: boolean;
}

export interface EndUserData {
  id: string;
  hasClicked: boolean;
}

export interface ExternalDevData {
  id: string;
  isCustomizing: boolean;
  isDeploying: boolean;
}

// Event data interfaces
export interface BuildButtonEventData extends Record<string, unknown> {
  instanceId: string;
  size: ButtonSize;
  color: ButtonColor;
}

export interface TestButtonEventData extends Record<string, unknown> {
  instanceId: string;
  buttonId: string;
}

export interface DeployButtonEventData extends Record<string, unknown> {
  instanceId: string;
  buttonId: string;
  target: "cloud" | "npm";
}

export interface ClickButtonEventData extends Record<string, unknown> {
  instanceId: string;
  buttonId: string;
}

export interface CustomizeButtonEventData extends Record<string, unknown> {
  instanceId: string;
  buttonId: string;
  size: ButtonSize;
  color: ButtonColor;
}

export interface ExternalDeployEventData extends Record<string, unknown> {
  instanceId: string;
  buttonId: string;
  target: "netlify" | "vercel" | "cloudflare";
}

// Create system and components
export const system = new System();

export const button = system.createComponent("button", {
  id: "",
  count: 0,
  size: "medium" as ButtonSize,
  color: "primary" as ButtonColor,
  isDeployed: false,
});

export const internalDev = system.createComponent("internalDev", {
  id: "",
  isTesting: false,
  isDeploying: false,
});

export const endUser = system.createComponent("endUser", {
  id: "",
  hasClicked: false,
});

export const externalDev = system.createComponent("externalDev", {
  id: "",
  isCustomizing: false,
  isDeploying: false,
});

// Event handlers
internalDev.on("BUILD_BUTTON", async (instanceId, data, component) => {
  const buildData = data as BuildButtonEventData;
  if (!["small", "medium", "large"].includes(buildData.size)) {
    throw new Error("Invalid button size");
  }

  // Create a new button instance
  const buttonComponent = system.getComponent("button");
  if (!buttonComponent) {
    throw new Error("Button component not found");
  }
  buttonComponent.createInstance(buildData.instanceId, {
    id: buildData.instanceId,
    size: buildData.size,
    color: buildData.color,
    count: 0,
    isDeployed: false,
  });

  return {
    send: [
      {
        component: "button",
        event: "BUTTON_CREATED",
        data: {
          instanceId: buildData.instanceId,
          size: buildData.size,
          color: buildData.color,
        } as Record<string, unknown>,
      },
    ],
  };
});

button.on("BUTTON_CREATED", async (instanceId, data, component) => {
  console.log(
    `[BUTTON_CREATED] Processing event for instance ${instanceId} with data:`,
    data,
  );
  const buttonData = data as Record<string, unknown>;
  const targetInstanceId = buttonData.instanceId as string;
  const existingInstance = component.getInstance(targetInstanceId);
  if (!existingInstance) {
    throw new Error(`Button instance ${targetInstanceId} not found`);
  }
  console.log(`[BUTTON_CREATED] Updating button with:`, {
    size: buttonData.size,
    color: buttonData.color,
  });
  return {
    update: {
      size: buttonData.size as ButtonSize,
      color: buttonData.color as ButtonColor,
    },
  };
});

internalDev.on("TEST_BUTTON", async (instanceId, data, component) => {
  const testData = data as TestButtonEventData;
  const buttonInstance = button.getInstance(testData.buttonId);
  if (!buttonInstance) {
    throw new Error("Button instance not found");
  }
  return {
    update: {
      isTesting: true,
    },
    send: [
      {
        component: "button",
        event: "BUTTON_CLICKED",
        data: {
          instanceId: testData.buttonId,
        } as Record<string, unknown>,
      },
    ],
  };
});

button.on("BUTTON_CLICKED", async (instanceId, data, component) => {
  const instance = component.getInstance(instanceId);
  if (!instance) {
    throw new Error("Button instance not found");
  }
  const buttonData = instance as unknown as ButtonData;
  return {
    update: {
      count: buttonData.count + 1,
    },
  };
});

internalDev.on("DEPLOY_BUTTON", async (instanceId, data, component) => {
  const deployData = data as DeployButtonEventData;
  const buttonInstance = button.getInstance(deployData.buttonId);
  if (!buttonInstance) {
    throw new Error("Button instance not found");
  }
  return {
    update: {
      isDeploying: true,
    },
    send: [
      {
        component: "button",
        event: "BUTTON_DEPLOYED",
        data: {
          instanceId: deployData.buttonId,
        } as Record<string, unknown>,
      },
    ],
  };
});

button.on("BUTTON_DEPLOYED", async (instanceId, data, component) => {
  return {
    update: {
      isDeployed: true,
    },
  };
});

endUser.on("CLICK_BUTTON", async (instanceId, data, component) => {
  const clickData = data as ClickButtonEventData;
  const buttonInstance = button.getInstance(clickData.buttonId);
  if (!buttonInstance) {
    throw new Error("Button instance not found");
  }
  return {
    update: {
      hasClicked: true,
    },
    send: [
      {
        component: "button",
        event: "BUTTON_CLICKED",
        data: {
          instanceId: clickData.buttonId,
        } as Record<string, unknown>,
      },
    ],
  };
});

externalDev.on("CUSTOMIZE_BUTTON", async (instanceId, data, component) => {
  const customizeData = data as CustomizeButtonEventData;
  const buttonInstance = button.getInstance(customizeData.buttonId);
  if (!buttonInstance) {
    throw new Error("Button instance not found");
  }
  if (!["small", "medium", "large"].includes(customizeData.size)) {
    throw new Error("Invalid button size");
  }
  return {
    update: {
      isCustomizing: true,
    },
    send: [
      {
        component: "button",
        event: "BUTTON_CUSTOMIZED",
        data: {
          instanceId: customizeData.buttonId,
          size: customizeData.size,
          color: customizeData.color,
        } as Record<string, unknown>,
      },
    ],
  };
});

button.on("BUTTON_CUSTOMIZED", async (instanceId, data, component) => {
  const customData = data as Record<string, unknown>;
  return {
    update: {
      size: customData.size as ButtonSize,
      color: customData.color as ButtonColor,
    },
  };
});

externalDev.on(
  "DEPLOY_BUTTON_EXTERNALLY",
  async (instanceId, data, component) => {
    const deployData = data as ExternalDeployEventData;
    const buttonInstance = button.getInstance(deployData.buttonId);
    if (!buttonInstance) {
      throw new Error("Button instance not found");
    }
    return {
      update: {
        isDeploying: true,
      },
      send: [
        {
          component: "button",
          event: "BUTTON_DEPLOYED",
          data: {
            instanceId: deployData.buttonId,
          } as Record<string, unknown>,
        },
      ],
    };
  },
);
