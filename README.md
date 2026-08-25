# Rust Enum Features: Rust, TypeScript, and OpenAPI

This repository is a small case study in keeping an enum contract aligned across Rust and TypeScript.

The example starts with a Rust enum, serializes it to JSON, and deserializes that JSON into a TypeScript discriminated union. It then explores what happens when the Rust enum grows, before introducing OpenAPI as the contract used to generate TypeScript types. Finally, selected Rust variants are feature-gated and the same contract is generated for several feature combinations.

## Questions this case study answers

- What JSON shape should represent a Rust enum?
- How does a TypeScript discriminated union consume that shape?
- What breaks when Rust adds a new variant?
- Can TypeScript safely handle enum values it does not know yet?
- Can OpenAPI describe the same enum contract independently of Rust?
- How do feature-specific API contracts map back to a base contract and to the all-features contract?

## Proposed workspace

```text
.
|-- Cargo.toml
|-- src/
|   |-- lib.rs                 # Feature-gated enum and serialization helpers
|   `-- bin/
|       `-- export_openapi.rs  # Emits the OpenAPI document for enabled features
|-- openapi/
|   |-- no-features.yaml
|   |-- basic.yaml
|   |-- advanced.yaml
|   `-- all-features.yaml
|-- typescript/
|   |-- generated/
|   |   |-- no-features.ts
|   |   |-- basic.ts
|   |   |-- advanced.ts
|   |   `-- all-features.ts
|   |-- consumer.ts
|   |-- compatibility.ts
|   `-- compatibility.test.ts
|-- tools/
|   |-- export-contracts.mjs
|   |-- generate-typescript.mjs
|   |-- validate-openapi.mjs
|   `-- check-contract-matrix.mjs
|-- .github/
|   `-- workflows/ci.yml
`-- README.md
```

The exact filenames are not essential; the important boundary is that Rust owns the source enum, OpenAPI records the public contract, and generated TypeScript is derived from OpenAPI rather than maintained by hand.

## 1. Serialize a Rust enum

Use Serde with an explicit tagged representation so the JSON contract is stable and easy for TypeScript to narrow:

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum Event {
    Created { id: String },
    Deleted { id: String, reason: String },
}
```

Example JSON:

```json
{
  "type": "Created",
  "data": { "id": "item-123" }
}
```

The first Rust example should include tests that serialize each variant and deserialize the resulting JSON again. The tests should assert the exact JSON shape, because changing enum representation changes the wire contract.

For unit-like variants, the `data` field can be omitted by choosing a representation that matches the desired API. The case study should make that choice explicit rather than letting a serializer default silently define the public format.

## 2. Consume the enum in TypeScript

The corresponding TypeScript type is a discriminated union:

```ts
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
```

The TypeScript consumer should demonstrate exhaustive handling. An `assertNever` helper can make compilation fail when a known variant is added but the consumer is not updated:

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled event: ${JSON.stringify(value)}`);
}
```

For data received over the network, use a runtime boundary such as `typescript/compatibility.ts`. Its `parseEvent` function validates the known payloads and converts an unknown discriminator, malformed payload, or invalid input into an explicit `Unknown` result. This keeps forward compatibility from being confused with compile-time knowledge of the generated union.

## 3. Case study: add a Rust variant

Add a new variant such as:

```rust
Archived { id: String },
```

This creates two different compatibility concerns:

1. **Compile-time knowledge:** regenerated TypeScript should contain `Archived`, and exhaustive switches should require a new branch.
2. **Runtime forward compatibility:** an older TypeScript client may receive `Archived` before it has been regenerated.

The study should compare two TypeScript policies:

- **Strict generated type:** accept only variants present in the generated contract. This gives strong exhaustiveness but requires coordinated deployment or regeneration.
- **Unknown-variant boundary:** validate incoming JSON at runtime and map unsupported discriminators to an explicit `Unknown`/fallback result. This allows an older client to keep operating, but it must not pretend that unknown data is a known variant.

The README's eventual implementation should test both policies. TypeScript's static type alone cannot protect a running application from new JSON received over the network; a runtime validator or an explicit boundary conversion is needed.

## 4. Define the OpenAPI contract

Create an OpenAPI 3.1 document that represents the tagged enum as a `oneOf` union. Each branch should constrain the discriminator and describe its payload:

```yaml
Event:
  oneOf:
    - $ref: '#/components/schemas/CreatedEvent'
    - $ref: '#/components/schemas/DeletedEvent'
  discriminator:
    propertyName: type
    mapping:
      Created: '#/components/schemas/CreatedEvent'
      Deleted: '#/components/schemas/DeletedEvent'

CreatedEvent:
  type: object
  required: [type, data]
  properties:
    type:
      const: Created
    data:
      $ref: '#/components/schemas/CreatedData'

DeletedEvent:
  type: object
  required: [type, data]
  properties:
    type:
      const: Deleted
    data:
      type: object
      required: [id, reason]
      properties:
        id:
          type: string
        reason:
          type: string
```

The Rust export tool should emit this document from the Rust definitions and enabled features. In this example, `openapi_document` is the explicit mapping from the compiled enum contract to OpenAPI; its Rust tests and the generated snapshots keep that mapping synchronized. Keep checked-in OpenAPI files as snapshots so a contract change is visible in a diff.

Validate every snapshot with an OpenAPI validator before generating code.

## 5. Generate TypeScript from OpenAPI

Add a small tool, `tools/generate-typescript.mjs`, that:

1. Reads an OpenAPI YAML or JSON file.
2. Validates the document.
3. Generates TypeScript types into a requested output directory.
4. Produces deterministic output suitable for version control.
5. Fails when the spec is invalid or when generation reports unsupported schemas.

A generator such as `openapi-typescript` can provide the conversion rather than requiring a custom OpenAPI parser. The tool should still be a repository-owned wrapper so all feature variants use identical options and output conventions.

Example interface:

```sh
node tools/generate-typescript.mjs \
  --input openapi/no-features.yaml \
  --output typescript/generated/no-features.ts
```

Generated files should be treated as build artifacts: edit the Rust enum or OpenAPI source, then regenerate them. Do not hand-edit generated TypeScript.

## 6. Feature-gate enum variants

Declare features in `Cargo.toml` and gate variants at their definition:

```rust
pub enum Event {
    Created { id: String },
  Deleted { id: String, reason: String },

    #[cfg(feature = "basic")]
    Archived { id: String },

    #[cfg(feature = "advanced")]
    Restored { id: String },
}
```

The export binary must compile with the same feature flags as the library. A feature-enabled OpenAPI document must not mention variants that were not compiled into that build.

Choose feature names that communicate the contract. In this example:

| Build | Enabled variants |
| --- | --- |
| No features | `Created`, `Deleted` |
| `basic` | Base variants plus `Archived` |
| `advanced` | Base variants plus `Restored` |
| All features | Base variants plus `Archived` and `Restored` |

If features have dependencies, document them in `Cargo.toml` and in the matrix. `--all-features` should be the authoritative all-capabilities build.

## 7. Produce and compare the contract matrix

Generate one OpenAPI snapshot and one TypeScript file for each build:

```sh
cargo run --bin export_openapi --no-default-features \
  > openapi/no-features.yaml

cargo run --bin export_openapi --no-default-features --features basic \
  > openapi/basic.yaml

cargo run --bin export_openapi --no-default-features --features advanced \
  > openapi/advanced.yaml

cargo run --bin export_openapi --all-features \
  > openapi/all-features.yaml
```

The complete pipeline can regenerate the snapshots, validate them, and generate all four TypeScript files:

```sh
npm run generate
```

Then inspect the generated contracts. They should show a predictable widening relationship:

```text
no-features  subset of  basic  subset of  all-features
no-features  subset of  advanced  subset of  all-features
```

That relationship applies to known variants, not necessarily to every payload detail or future schema change. The case study should compare the generated unions and record:

- Which variants are available in each build.
- Whether a feature-specific client can consume the no-feature contract.
- Whether a no-feature client can safely consume a feature-enabled response.
- Whether the all-features TypeScript type needs an unknown-variant runtime policy.
- Whether feature flags describe deployment capabilities, client capabilities, or both.

A useful compatibility rule is that adding a response variant is not automatically backward compatible for exhaustive clients. It is safer when clients tolerate unknown discriminators at the runtime boundary, and it is safest when the API uses a versioning or capability-negotiation policy that makes the set of possible variants explicit.

## Suggested commands

Once implemented, the repository should support commands similar to:

```sh
cargo test
cargo test --all-features
cargo run --bin export_openapi --no-default-features
cargo run --bin export_openapi --all-features
npm ci
npm run export:openapi
npm run validate:openapi
npm run generate
npm run check:contracts
npm test
```

The final test suite should cover Rust JSON snapshots, OpenAPI validation, deterministic generation, TypeScript compilation, the contract matrix check, and representative runtime handling of an unknown variant.

## Expected outcome

The completed case study should leave four readable OpenAPI documents and four generated TypeScript contracts that can be compared side by side. The main lesson should be visible in the diffs: Rust feature selection changes the exported contract, OpenAPI makes that change inspectable and tool-independent, and TypeScript consumers must choose deliberately between strict exhaustiveness and forward-compatible runtime handling.
