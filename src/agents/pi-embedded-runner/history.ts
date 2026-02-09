import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { OpenClawConfig } from "../../config/config.js";

const THREAD_SUFFIX_REGEX = /^(.*)(?::(?:thread|topic):\d+)$/i;

function stripThreadSuffix(value: string): string {
  const match = value.match(THREAD_SUFFIX_REGEX);
  return match?.[1] ?? value;
}

/**
 * Limits conversation history to the last N user turns (and their associated
 * assistant responses). This reduces token usage for long-running DM sessions.
 */
export function limitHistoryTurns(
  messages: AgentMessage[],
  limit: number | undefined,
): AgentMessage[] {
  if (!limit || limit <= 0 || messages.length === 0) {
    return messages;
  }

  let userCount = 0;
  let lastUserIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      userCount++;
      if (userCount > limit) {
        return messages.slice(lastUserIndex);
      }
      lastUserIndex = i;
    }
  }
  return messages;
}

/**
 * Truncates large message content in historical turns to save tokens.
 * Specifically targets tool results and long assistant outputs.
 */
export function pruneHistoryContent(
  messages: AgentMessage[],
  options: { maxCharsPerMessage?: number; keepLastN?: number } = {},
): AgentMessage[] {
  const maxChars = options.maxCharsPerMessage ?? 2000;
  const keepLastN = options.keepLastN ?? 2;

  return messages.map((msg, index) => {
    // Never prune the last few turns or user messages
    if (index >= messages.length - keepLastN || msg.role === "user") {
      return msg;
    }

    // Type-safe content check for union types in AgentMessage
    const msgWithContent = msg as Extract<AgentMessage, { content: any }>;
    if (!msgWithContent.content) {
      return msg;
    }

    if (typeof msgWithContent.content === "string" && msgWithContent.content.length > maxChars) {
      return {
        ...msg,
        content:
          msgWithContent.content.slice(0, maxChars) +
          "\n\n[... Content truncated by Token Optimizer to save memory ...]",
      } as AgentMessage;
    }

    if (Array.isArray(msgWithContent.content)) {
      const prunedContent = msgWithContent.content.map((part: any) => {
        if (
          part &&
          typeof part === "object" &&
          part.type === "text" &&
          typeof part.text === "string" &&
          part.text.length > maxChars
        ) {
          return {
            ...part,
            text: part.text.slice(0, maxChars) + "\n\n[... Text truncated by Token Optimizer ...]",
          };
        }
        return part;
      });
      return { ...msg, content: prunedContent } as AgentMessage;
    }

    return msg;
  });
}

/**
 * Extract provider + user ID from a session key and look up dmHistoryLimit.
 * Supports per-DM overrides and provider defaults.
 */
export function getDmHistoryLimitFromSessionKey(
  sessionKey: string | undefined,
  config: OpenClawConfig | undefined,
): number | undefined {
  if (!sessionKey || !config) {
    return undefined;
  }

  const parts = sessionKey.split(":").filter(Boolean);
  const providerParts = parts.length >= 3 && parts[0] === "agent" ? parts.slice(2) : parts;

  const provider = providerParts[0]?.toLowerCase();
  if (!provider) {
    return undefined;
  }

  const kind = providerParts[1]?.toLowerCase();
  const userIdRaw = providerParts.slice(2).join(":");
  const userId = stripThreadSuffix(userIdRaw);

  const getLimit = (
    providerConfig:
      | {
          dmHistoryLimit?: number;
          dms?: Record<string, { historyLimit?: number }>;
        }
      | undefined,
  ): number | undefined => {
    if (!providerConfig) {
      return undefined;
    }
    if (userId && providerConfig.dms?.[userId]?.historyLimit !== undefined) {
      return providerConfig.dms[userId].historyLimit;
    }
    return providerConfig.dmHistoryLimit;
  };

  const resolveProviderConfig = (
    cfg: OpenClawConfig | undefined,
    providerId: string,
  ): { dmHistoryLimit?: number; dms?: Record<string, { historyLimit?: number }> } | undefined => {
    const channels = cfg?.channels;
    if (!channels || typeof channels !== "object") {
      return undefined;
    }
    const entry = (channels as Record<string, unknown>)[providerId];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return undefined;
    }
    return entry as { dmHistoryLimit?: number; dms?: Record<string, { historyLimit?: number }> };
  };

  // Accept both "direct" (new) and "dm" (legacy) for backward compat
  if (kind === "dm" || kind === "direct") {
    return getLimit(resolveProviderConfig(config, provider));
  }

  if (kind === "group") {
    // @ts-ignore - groupHistoryLimit added to schema
    return config.agents?.defaults?.groupHistoryLimit;
  }

  // Handle main session or other types
  if (parts[1] === "main" && parts[2] === "main") {
    // @ts-ignore
    return config.agents?.defaults?.groupHistoryLimit;
  }

  return undefined;
}
