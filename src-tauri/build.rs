use std::fs;

fn main() {
    tauri_build::build();

    // Read version and releaseDate from package.json at compile time
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let pkg_json_path = manifest_dir.parent().unwrap().join("package.json");
    let pkg_json = fs::read_to_string(&pkg_json_path)
        .expect("Failed to read package.json");

    let version = extract_json_string(&pkg_json, "version")
        .expect("Missing \"version\" in package.json");
    let release_date = extract_json_string(&pkg_json, "releaseDate")
        .expect("Missing \"releaseDate\" in package.json");

    println!("cargo:rustc-env=APP_VERSION={}", version);
    println!("cargo:rustc-env=APP_RELEASE_DATE={}", release_date);
    println!("cargo:rerun-if-changed={}", pkg_json_path.display());
}

/// Minimal JSON string field extractor (no extra dependencies needed)
fn extract_json_string(json: &str, key: &str) -> Option<String> {
    let search = format!("\"{}\"", key);
    let key_pos = json.find(&search)?;
    let after_key = &json[key_pos + search.len()..];
    let colon_pos = after_key.find(':')?;
    let after_colon = after_key[colon_pos + 1..].trim_start();
    if after_colon.starts_with('"') {
        let inner = &after_colon[1..];
        let end = inner.find('"')?;
        Some(inner[..end].to_string())
    } else {
        None
    }
}
