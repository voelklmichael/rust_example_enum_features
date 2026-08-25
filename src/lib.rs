use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum Event {
    Created { id: String },
    Deleted { id: String, reason: String },
    #[cfg(feature = "basic")]
    Archived { id: String },
    #[cfg(feature = "advanced")]
    Restored { id: String },
}

pub fn openapi_document() -> Value {
    #[allow(unused_mut)]
    let mut event_schemas = vec![
        json!({ "$ref": "#/components/schemas/CreatedEvent" }),
        json!({ "$ref": "#/components/schemas/DeletedEvent" }),
    ];
    #[allow(unused_mut)]
    let mut mapping = json!({
        "Created": "#/components/schemas/CreatedEvent",
        "Deleted": "#/components/schemas/DeletedEvent",
    });

    let mut schemas = json!({
        "CreatedEvent": event_schema("Created", json!({
            "type": "object",
            "required": ["id"],
            "properties": { "id": { "type": "string" } }
        })),
        "DeletedEvent": event_schema("Deleted", json!({
            "type": "object",
            "required": ["id", "reason"],
            "properties": {
                "id": { "type": "string" },
                "reason": { "type": "string" }
            }
        })),
    });

    #[cfg(feature = "basic")]
    {
        event_schemas.push(json!({ "$ref": "#/components/schemas/ArchivedEvent" }));
        mapping["Archived"] = json!("#/components/schemas/ArchivedEvent");
        schemas["ArchivedEvent"] = event_schema("Archived", json!({
            "type": "object",
            "required": ["id"],
            "properties": { "id": { "type": "string" } }
        }));
    }

    #[cfg(feature = "advanced")]
    {
        event_schemas.push(json!({ "$ref": "#/components/schemas/RestoredEvent" }));
        mapping["Restored"] = json!("#/components/schemas/RestoredEvent");
        schemas["RestoredEvent"] = event_schema("Restored", json!({
            "type": "object",
            "required": ["id"],
            "properties": { "id": { "type": "string" } }
        }));
    }

    schemas["Event"] = json!({
        "oneOf": event_schemas,
        "discriminator": { "propertyName": "type", "mapping": mapping }
    });

    json!({
        "openapi": "3.1.0",
        "info": { "title": "Rust enum feature example", "version": "0.1.0" },
        "paths": {},
        "components": {
            "schemas": schemas
        }
    })
}

fn event_schema(name: &str, data_schema: Value) -> Value {
    json!({
        "type": "object",
        "required": ["type", "data"],
        "properties": {
            "type": { "const": name },
            "data": data_schema
        }
    })
}

#[cfg(test)]
mod tests {
    use super::{openapi_document, Event};

    fn event_refs() -> Vec<String> {
        openapi_document()["components"]["schemas"]["Event"]["oneOf"]
            .as_array()
            .unwrap()
            .iter()
            .map(|entry| entry["$ref"].as_str().unwrap().to_owned())
            .collect()
    }

    #[test]
    fn created_round_trips() {
        let event = Event::Created {
            id: "item-123".into(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert_eq!(json, r#"{"type":"Created","data":{"id":"item-123"}}"#);
        assert_eq!(serde_json::from_str::<Event>(&json).unwrap(), event);
    }

    #[test]
    fn deleted_round_trips_with_reason() {
        let event = Event::Deleted {
            id: "item-123".into(),
            reason: "retention policy".into(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert_eq!(json, r#"{"type":"Deleted","data":{"id":"item-123","reason":"retention policy"}}"#);
        assert_eq!(serde_json::from_str::<Event>(&json).unwrap(), event);
    }

    #[test]
    fn openapi_includes_base_variants() {
        let refs = event_refs();
        assert!(refs.contains(&"#/components/schemas/CreatedEvent".into()));
        assert!(refs.contains(&"#/components/schemas/DeletedEvent".into()));
    }

    #[cfg(feature = "basic")]
    #[test]
    fn archived_round_trips() {
        let event = Event::Archived {
            id: "item-123".into(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert_eq!(json, r#"{"type":"Archived","data":{"id":"item-123"}}"#);
        assert_eq!(serde_json::from_str::<Event>(&json).unwrap(), event);
        assert!(event_refs().contains(&"#/components/schemas/ArchivedEvent".into()));
    }

    #[cfg(feature = "advanced")]
    #[test]
    fn restored_round_trips() {
        let event = Event::Restored {
            id: "item-123".into(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert_eq!(json, r#"{"type":"Restored","data":{"id":"item-123"}}"#);
        assert_eq!(serde_json::from_str::<Event>(&json).unwrap(), event);
        assert!(event_refs().contains(&"#/components/schemas/RestoredEvent".into()));
    }
}
