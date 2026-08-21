// main.rs — l'involucro nativo di MISTER (Tauri v2).
//
// Tutto il gioco vive nel frontend web (/src): qui si apre solo la
// finestra nativa e si registrano i due plugin che permettono al gioco
// di SALVARE FILE sul disco (la finestra "Salva con nome" e la scrittura
// vera e propria) — nel browser normale ci pensa il download, dentro
// l'app nativa servono questi.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("errore nell'avvio di MISTER");
}
