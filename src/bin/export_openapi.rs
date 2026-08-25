use rust_example_enum_features::openapi_document;

fn main() {
    let document = openapi_document();
    println!("{}", serde_yaml::to_string(&document).expect("OpenAPI should serialize"));
}
