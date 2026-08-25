export type paths = Record<string, never>;
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
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
        Event: components["schemas"]["CreatedEvent"] | components["schemas"]["DeletedEvent"];
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

