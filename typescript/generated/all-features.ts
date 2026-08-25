export type paths = Record<string, never>;
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ArchivedEvent: {
            data: {
                id: string;
            };
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "Archived";
        };
        CreatedEvent: {
            data: {
                id: string;
            };
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "Created";
        };
        DeletedEvent: {
            data: {
                id: string;
                reason: string;
            };
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "Deleted";
        };
        Event: components["schemas"]["CreatedEvent"] | components["schemas"]["DeletedEvent"] | components["schemas"]["ArchivedEvent"] | components["schemas"]["RestoredEvent"];
        RestoredEvent: {
            data: {
                id: string;
            };
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "Restored";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

