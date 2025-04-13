import { describe, it, expect, beforeEach } from "vitest";
import {
  system,
  button,
  internalDev,
  endUser,
  externalDev,
} from "../button-system";
import type {
  ButtonSize,
  ButtonColor,
  BuildButtonEventData,
  TestButtonEventData,
  DeployButtonEventData,
  ClickButtonEventData,
  CustomizeButtonEventData,
  ExternalDeployEventData,
} from "../button-system";

describe("Button System", () => {
  beforeEach(() => {
    // Clear all instances
    button.clearInstances();
    internalDev.clearInstances();
    endUser.clearInstances();
    externalDev.clearInstances();
  });

  describe("Internal Developer Workflow", () => {
    it("should build and create a button with proper relationships", async () => {
      const devId = "dev1";
      const buttonId = "button_1";
      internalDev.createInstance("internalDev", devId, {});

      const buildData: BuildButtonEventData = {
        instanceId: buttonId,
        size: "large",
        color: "primary",
      };

      system.queueEvent("internalDev", devId, "BUILD_BUTTON", buildData);
      await system.processEvents();

      const buttonInstance = button.getInstance(buttonId);
      console.log("buttinst", buttonInstance);
      expect(buttonInstance).toBeDefined();
      expect(buttonInstance?.size).toBe("large");
      expect(buttonInstance?.color).toBe("primary");
      expect(buttonInstance?.parentInstanceId).toBe(devId);
      expect(buttonInstance?.siblingInstanceIds).toEqual([]);
      expect(buttonInstance?.siblingIndex).toBe(0);
    });

    it("should test the button by clicking it", async () => {
      const devId = "dev1";
      const buttonId = "button1";
      internalDev.createInstance("internalDev", devId, {});
      button.createInstance("button", buttonId, {
        parentInstanceId: devId,
      });

      const testData: TestButtonEventData = {
        instanceId: devId,
        buttonId,
      };

      system.queueEvent("internalDev", devId, "TEST_BUTTON", testData);
      await system.processEvents();

      expect(button.getInstanceCount()).toBe(1);
      expect(internalDev.getInstance(devId)?.isTesting).toBe(true);
    });

    it("should deploy the button to cloud and npm", async () => {
      const devId = "dev1";
      const buttonId = "button1";
      internalDev.createInstance("internalDev", devId, {});
      button.createInstance("button", buttonId, {
        parentInstanceId: devId,
      });

      // Deploy to cloud
      const cloudDeployData: DeployButtonEventData = {
        instanceId: devId,
        buttonId,
        target: "cloud",
      };

      system.queueEvent("internalDev", devId, "DEPLOY_BUTTON", cloudDeployData);
      await system.processEvents();

      let buttonInstance = button.getInstance(buttonId);
      expect(buttonInstance?.isDeployed).toBe(true);
      expect(internalDev.getInstance(devId)?.isDeploying).toBe(true);

      // Deploy to npm
      const npmDeployData: DeployButtonEventData = {
        instanceId: devId,
        buttonId,
        target: "npm",
      };

      system.queueEvent("internalDev", devId, "DEPLOY_BUTTON", npmDeployData);
      await system.processEvents();

      buttonInstance = button.getInstance(buttonId);
      expect(buttonInstance?.isDeployed).toBe(true);
    });
  });

  describe("End User Workflow", () => {
    it("should allow end users to click the button", async () => {
      const userId = "user1";
      const buttonId = "button1";
      endUser.createInstance("endUser", userId, {});
      button.createInstance("button", buttonId, {
        parentInstanceId: userId,
      });

      const clickData: ClickButtonEventData = {
        instanceId: userId,
        buttonId,
      };

      system.queueEvent("endUser", userId, "CLICK_BUTTON", clickData);
      await system.processEvents();

      const userInstance = endUser.getInstance(userId);
      expect(button.getInstanceCount()).toBe(1);
      expect(userInstance?.hasClicked).toBe(true);
    });

    it("should increment count on multiple clicks", async () => {
      const userId = "user1";
      const buttonId = "button1";
      endUser.createInstance("endUser", userId, {});
      button.createInstance("button", buttonId, {
        parentInstanceId: userId,
      });
      button.createInstance("button", "button2", {
        parentInstanceId: userId,
      });
      button.createInstance("button", "button3", {
        parentInstanceId: userId,
      });

      const clickData: ClickButtonEventData = {
        instanceId: userId,
        buttonId,
      };

      // Click three times
      for (let i = 0; i < 3; i++) {
        system.queueEvent("endUser", userId, "CLICK_BUTTON", clickData);
        await system.processEvents();
      }

      expect(button.getInstanceCount()).toBe(3);
    });
  });

  describe("External Developer Workflow", () => {
    it("should allow customization of button properties", async () => {
      const devId = "extDev1";
      const buttonId = "button1";
      externalDev.createInstance("externalDev", devId, {});
      button.createInstance("button", buttonId, {
        parentInstanceId: devId,
      });

      const customizeData: CustomizeButtonEventData = {
        instanceId: devId,
        buttonId,
        size: "small",
        color: "danger",
      };
      system.queueEvent(
        "externalDev",
        devId,
        "CUSTOMIZE_BUTTON",
        customizeData,
      );
      await system.processEvents();

      const buttonInstance = button.getInstance(buttonId);
      const devInstance = externalDev.getInstance(devId);
      expect(buttonInstance?.size).toBe("small");
      expect(buttonInstance?.color).toBe("danger");
      expect(devInstance?.isCustomizing).toBe(true);
    });

    it("should allow external deployment to different platforms", async () => {
      const devId = "extDev1";
      const buttonId = "button1";
      externalDev.createInstance("externalDev", devId, {});
      button.createInstance("button", buttonId, {
        parentInstanceId: devId,
      });

      // Deploy to Netlify
      const netlifyDeployData: ExternalDeployEventData = {
        instanceId: devId,
        buttonId,
        target: "netlify",
      };

      system.queueEvent(
        "externalDev",
        devId,
        "DEPLOY_BUTTON_EXTERNALLY",
        netlifyDeployData,
      );
      await system.processEvents();

      let buttonInstance = button.getInstance(buttonId);
      let devInstance = externalDev.getInstance(devId);
      expect(buttonInstance?.isDeployed).toBe(true);
      expect(devInstance?.isDeploying).toBe(true);

      const newDevId = "extDev2";
      const newButtonId = "button2";
      externalDev.createInstance("externalDev", newDevId, {});
      button.createInstance("button", newButtonId, {
        parentInstanceId: newDevId,
      });

      // Deploy to Vercel
      const vercelDeployData: ExternalDeployEventData = {
        instanceId: newDevId,
        buttonId: newButtonId,
        target: "vercel",
      };

      system.queueEvent(
        "externalDev",
        newDevId,
        "DEPLOY_BUTTON_EXTERNALLY",
        vercelDeployData,
      );
      await system.processEvents();

      buttonInstance = button.getInstance(newButtonId);
      devInstance = externalDev.getInstance(newDevId);
      expect(buttonInstance?.isDeployed).toBe(true);
      expect(devInstance?.isDeploying).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent button IDs", async () => {
      const devId = "dev1";
      const nonExistentButtonId = "non-existent";
      internalDev.createInstance("internalDev", devId, {});

      const testData: TestButtonEventData = {
        instanceId: devId,
        buttonId: nonExistentButtonId,
      };

      await expect(
        internalDev.processEvent(devId, "TEST_BUTTON", testData),
      ).rejects.toThrow();
    });

    it("should handle invalid button sizes", async () => {
      const devId = "dev1";
      const buttonId = "button1";
      internalDev.createInstance("internalDev", devId, {});
      button.createInstance("button", buttonId, {});

      const buildData = {
        instanceId: buttonId,
        size: "invalid" as ButtonSize,
        color: "primary" as ButtonColor,
      };

      await expect(
        internalDev.processEvent(devId, "BUILD_BUTTON", buildData),
      ).rejects.toThrow();
    });
  });
});
