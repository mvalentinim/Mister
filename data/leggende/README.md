# data/leggende/ — canale di import per Icons e Heroes

I giocatori "leggenda" (le **Icons** e gli **Heroes** di FC 26, e in futuro le
rose delle squadre Legends del FRD §5.3) entrano nel database da file JSON in
questa cartella: ogni `*.json` viene letto da `npm run importa-dati` e i suoi
giocatori vengono inseriti con il **tag `categoria`** (`icon` o `hero`).

Il tag serve alle regole di gioco future: ogni carriera potrà scegliere se
includere o escludere queste categorie dalle rose.

> Perché JSON e non un import automatico? Il file "Icons and Heroes Unlock"
> (squad file del gioco) è in formato binario proprietario EA, non leggibile.
> Il dataset Kaggle delle carte FUT ("Complete EA FC26 Rating Cards Database")
> è la fonte candidata: quando sarà disponibile nel repository, uno script di
> conversione genererà questi JSON automaticamente.

## Formato

```json
{
  "categoria": "icon",
  "giocatori": [
    {
      "nome": "Diego",
      "cognome": "Maradona",
      "data_nascita": "1960-10-30",
      "nazionalita": "Argentina",
      "ruolo": "TRQ",
      "ruoli_secondari": ["PC"],
      "piede": "sinistro",
      "potenziale": 97,
      "attributi": {
        "velocita": 90, "resistenza": 82, "tecnica": 97, "passaggio": 93,
        "tiro": 91, "dribbling": 97, "colpo_testa": 68, "marcatura": 40,
        "contrasto": 45, "posizionamento": 94, "visione": 96, "calci_piazzati": 94
      }
    }
  ]
}
```

Note:
- `id` è opzionale: se assente viene assegnato automaticamente a partire da
  900000 (mai in conflitto con i player_id di EA).
- per i portieri usare gli attributi `riflessi`, `presa`, `uscite`, `rinvio`
  (più `velocita` e `resistenza`).
- i ruoli usano il vocabolario del progetto: POR DC TD TS MED CC TRQ ED ES PC.
