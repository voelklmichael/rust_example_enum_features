export type Event =
  | { type: "Created"; data: { id: string } }
  | { type: "Deleted"; data: { id: string; reason: string } };

export function describe(event: Event): string {
  switch (event.type) {
    case "Created":
      // event.data.reason would not compile here: Created has no reason.
      return `created ${event.data.id}`;
    case "Deleted":
      return `deleted ${event.data.id}: ${event.data.reason}`;
  }
}
