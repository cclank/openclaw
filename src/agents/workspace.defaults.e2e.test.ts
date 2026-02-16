import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveDefaultAgentWorkspaceDir } from "./workspace.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveDefaultAgentWorkspaceDir", () => {
  it("uses OPENCLAW_HOME when resolving the default workspace dir", () => {
    const isWindows = process.platform === "win32";
    const home = isWindows ? "C:\\openclaw-home" : "/srv/openclaw-home";
    vi.stubEnv("OPENCLAW_HOME", home);
    vi.stubEnv("HOME", isWindows ? "C:\\Users\\other" : "/home/other");

    const expected = path.join(path.resolve(home), ".openclaw", "workspace");
    expect(resolveDefaultAgentWorkspaceDir()).toBe(expected);
  });
});
