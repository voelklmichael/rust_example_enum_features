import type { components } from "./generated/all-features.js";

export type Event = components["schemas"]["Event"];

export type UnknownEvent = {
  type: "Unknown";
  originalType: string;
  data: unknown;
};

export type CompatibleEvent = Event | UnknownEvent;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function isIdData(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === "string";
}

function isDeletedData(value: unknown): value is { id: string; reason: string } {
  return isRecord(value) && typeof value.id === "string" && typeof value.reason === "string";
}

export function parseEvent(input: unknown): CompatibleEvent {
  if (!isRecord(input) || typeof input.type !== "string") {
    return { type: "Unknown", originalType: "invalid", data: input };
  }

  if (input.type === "Created" && isIdData(input.data)) {
    return { type: "Created", data: input.data };
  }

  if (input.type === "Deleted" && isDeletedData(input.data)) {
    return { type: "Deleted", data: input.data };
  }

  return {
    type: "Unknown",
    originalType: input.type,
    data: input.data,
  };
}

export function describeCompatibleEvent(event: CompatibleEvent): string {
  switch (event.type) {
    case "Created":
      return `created ${event.data.id}`;
    case "Deleted":
      return `deleted ${event.data.id}: ${event.data.reason}`;
    case "Archived":
      return `archived ${event.data.id}`;
    case "Restored":
      return `restored ${event.data.id}`;
    case "Unknown":
      return `unsupported event: ${event.originalType}`;
  }
}
