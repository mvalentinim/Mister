// scarica.ts — salvare un file sul disco, nel browser E nell'app nativa.
//
// Nel BROWSER un file "si scarica": si crea un link temporaneo con
// l'attributo download e si simula il click (finisce in Download).
// Nell'APP NATIVA (Tauri, M10) quel trucco non funziona: la WebView di
// macOS non gestisce i download. Lì si usa la vera finestra
// "Salva con nome" del sistema (plugin dialog) e si scrive il file dove
// l'utente ha scelto (plugin fs). Questa funzione nasconde la differenza:
// il resto dell'app chiama scaricaFile e basta.

/** true quando il gioco gira dentro l'app nativa Tauri. */
export const dentroTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Salva `dati` (testo o byte) in un file chiamato `nome`. */
export async function scaricaFile(
  nome: string,
  dati: string | Uint8Array,
  tipoMime: string,
): Promise<void> {
  if (dentroTauri) {
    // import dinamici: nel browser normale questi moduli non si caricano mai
    const { save } = await import('@tauri-apps/plugin-dialog')
    const percorso = await save({ defaultPath: nome })
    if (!percorso) return // l'utente ha annullato
    const fs = await import('@tauri-apps/plugin-fs')
    if (typeof dati === 'string') await fs.writeTextFile(percorso, dati)
    else await fs.writeFile(percorso, dati)
    return
  }
  const blob = new Blob([dati as BlobPart], { type: tipoMime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
