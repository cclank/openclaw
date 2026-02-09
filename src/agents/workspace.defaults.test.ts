import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("DEFAULT_AGENT_WORKSPACE_DIR", () => {
  it("uses OPENCLAW_HOME at module import time", async () => {
    const isWindows = process.platform === "win32";
    const mockHome = isWindows ? "C:\\openclaw-home" : "/srv/openclaw-home";
    const expected = isWindows
      ? "C:\\openclaw-home\\.openclaw\\workspace"
      : "/srv/openclaw-home/.openclaw/workspace";

    vi.stubEnv("OPENCLAW_HOME", mockHome);
    vi.stubEnv("HOME", isWindows ? "C:\\Users\\other" : "/home/other");
    vi.resetModules();

    const mod = await import("./workspace.js");
    expect(mod.DEFAULT_AGENT_WORKSPACE_DIR).toBe(expected);
  });
});
