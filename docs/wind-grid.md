# Campo vento reale — verifica e predisposizione

Verifica del 24 novembre 2026. **Non attivo nell’app**: nessun quarto pulsante, nessuna superficie generata dai cinque punti della rotta. Grafici, meteo locale animato e viaggio restano invariati.

## Dati verificati su file reali

- Fonte prioritaria: [ItaliaMeteo / MeteoHub ICON-2I](https://dati.agenziaitaliameteo.it/dataset/previsioni-meteorologiche-modello-icon-2i).
- [Licenza CC BY 4.0 e attribuzione](https://meteohub.agenziaitaliameteo.it/app/license): Agenzia ItaliaMeteo in cooperazione con Arpae Emilia-Romagna. Ammesso riutilizzo commerciale con attribuzione e indicazione delle trasformazioni.
- [Directory pubblica del modello](https://meteohub.agenziaitaliameteo.it/nwp/ICON-2I_SURFACE_PRESSURE_LEVELS/): download HTTP senza credenziali verificato, run `2026112400`, file completi U_10M, V_10M e FR_LAND. Nessun prezzo di accesso riscontrato; nessuna garanzia di disponibilità o quota/SLA di download verificata. Evitare richieste ripetute: una sola acquisizione per run.
- ecCodes conferma: GRIB2 `regular_ll`, 761 × 761 nodi, coordinate da 3°E/33,7°N a 22°E/48,9°N, passo 0,025° longitudine e 0,02° latitudine. La griglia geografica distribuita è regolare, indipendentemente dalla griglia interna del modello.
- U e V sono componenti **geografiche** a 10 metri, in m/s (`uvRelativeToGrid=0`), non componenti da ruotare rispetto alla griglia. U positiva verso est, V positiva verso nord. La provenienza meteorologica è opposta al vettore di movimento.
- Ciascun file vento contiene 73 campi orari, da 24/11 00 UTC a 27/11 00 UTC. Timestamp di inizializzazione e validità sono letti nel GRIB, non dedotti dalla data del download.
- FR_LAND contiene frazione terrestre 0–1 sulla stessa griglia. Maschera conservativa: nessuna interpolazione se un nodo contribuente è terrestre (≥0,5) o assente. La risoluzione del modello non descrive tutti i canali lagunari: assenza di particelle vicino costa non equivale ad assenza di vento.

### Misure della prova

U e V: 84.565.244 byte ciascuno; FR_LAND: 1.158.428 byte. Totale 170.288.916 byte per run; due run/giorno equivalgono a circa 340,6 MB/giorno (10,2 GB/30 giorni), prima di eventuali variazioni del formato. Non scaricarli sui telefoni.

Conversione locale verificata sulle 49 ore 24/11 07 UTC–26/11 07 UTC, area richiesta 12–15°E / 43–46°N: rettangolo con bordo interpolabile 121 × 152 nodi, 49 file gzip, circa 5,30 MB complessivi; prima ora 107.740 byte. Punto offshore 45°N / 13°E alla prima ora: U −5,1631 m/s, V +3,1312 m/s, circa 11,74 kn da 121,24°. È una previsione del run verificato, **non una misura in tempo reale né un dato da mantenere nell’app**.

Tutti i file convertiti sono stati decodificati e accettati dal contratto TypeScript dell’app. I dati della prova rimangono temporanei, non pubblicati né inclusi nel codice.

## Costi e limiti: correzione importante

[Open-Meteo Free API](https://open-meteo.com/en/terms) è limitata all’uso non commerciale: app con abbonamenti sono esplicitamente uso commerciale. Limiti dichiarati: 600/minuto, 5.000/ora, 10.000/giorno. Una serie di richieste puntuali su una griglia arbitraria non va presentata come accesso alla griglia nativa completa ICON-2I.

La [pagina prezzi](https://open-meteo.com/en/pricing) indica piani commerciali e conteggio per località/variabili; la tariffa monetaria non era leggibile nella risposta ricevuta: nessun importo inventato. La precedente affermazione «a costo zero tramite Open-Meteo» non è valida per questa app. Nessuna modifica alle previsioni esistenti né acquisto effettuato in questa richiesta.

MeteoHub rende accessibili i file verificati sotto licenza aperta; questo non rende gratuito l’intero sistema: elaborazione automatica, archiviazione e distribuzione richiedono un servizio operativo. Costo mensile ancora da determinare presso un fornitore reale; nessun servizio a pagamento attivato.

## Preparato nel progetto

- `tools/wind-grid/convert.py`: preprocessore esterno con ecCodes. Accetta file U/V/maschera della stessa run, bbox, intervallo UTC e timestamp reale del download; verifica metadati, copertura, scansione, unità e completezza prima di scrivere. Produce solo i nodi e le ore richiesti, un file gzip per ora e un manifest finale. Non esegue download, hosting o aggiornamenti da solo.
- `src/lib/wind-grid.ts`: contratto validato U/V, provenienza, geometria, maschera, bilineare spaziale e interpolazione temporale soltanto tra ore adiacenti della stessa run/griglia. Nessun fallback sui cinque punti, nessuna estrapolazione fuori copertura e nessuna richiesta durante la riproduzione.
- Test automatici su dati sintetici esclusivamente di test: rifiuto dei cinque punti, campi obbligatori, copertura, maschera, buchi orari, run miste e conversione direzione/nodi.

Esecuzione su una macchina esterna adatta a ecCodes:

```sh
python3 -m pip install -r tools/wind-grid/requirements.txt
python3 tools/wind-grid/convert.py \
  --u /tmp/U_10M.grib --v /tmp/V_10M.grib --land /tmp/FR_LAND.grib \
  --run 2026112400 --retrieved-at 2026-11-24T06:18:13Z \
  --bbox 12 43 15 46 --start 2026-11-24T07:00:00Z --hours 48 \
  --output /tmp/wind-tiles
```

Gli argomenti sopra riproducono la prova, non sono configurazione operativa per date future. Il processo automatico dovrà scegliere una run fresca e bracket UTC dell’orizzonte richiesto.

## Architettura da attivare prima del layer

```text
MeteoHub: U_10M + V_10M + FR_LAND
  -> acquisizione una volta per run, retry e controllo checksum/metadati
  -> job esterno ecCodes: tile geografici con bordi + ore necessarie
  -> pubblicazione immutabile run / tile / validTime
  -> manifest current sostituito atomicamente solo se completo
  -> carta: bbox visibile + ora selezionata -> cache limitata di tile
  -> interpolazione U/V -> layer particelle Leaflet
```

Decodifica GRIB e librerie native non sono adatte al Worker dell’app. Il convertitore **non** è una funzione server importabile dall’app. Occorre predisporre il job esterno e una destinazione pubblica per i soli dati meteo; nessuna informazione account nelle tile.

Distribuzione: CORS sull’origine dell’app, `Content-Encoding: gzip` e `Content-Type: application/json` per lettura con fetch, URL immutabili e cache CDN per run, manifest con cache breve. Staging isolato per run/bbox, checksum e verifica di tutte le tile prima dello switch del manifest. In mancanza di run fresca/campo/ora mostrare «non disponibile», senza riciclare silenziosamente un run vecchio.

Il job non deve generare i file su ogni apertura né su ogni particella. Un manifest con i soli puntatori non garantisce che la griglia sia aggiornata: controllare run e copertura prima di renderizzarla. Prevedere tile di circa 1° con bordo comune per bilineare; risoluzione/coarsening e numero di ore in memoria vanno misurati su telefono, senza promettere frame rate prima della prova.

## Rendering e interazione: proposta, non già verificati

[Leaflet Velocity](https://github.com/onaci/leaflet-velocity) è un candidato Canvas2D, **non GPU/WebGL**; il formato U/V è idoneo ma compatibilità con leaflet-rotate e prestazioni devono essere provate. [WebGL Wind](https://github.com/mapbox/webgl-wind) dimostra advezione GPU, ma non è un layer Leaflet pronto: richiede un adattatore e verifica della licenza. Nessuna libreria installata né dichiarata compatibile senza prova.

Mantenere Leaflet e la rotazione attuale. Layer trasparente separato sotto rotta/marker/barca, allineato alle trasformazioni di pan/zoom/rotazione; campionamento georeferenziato al tocco. Particelle avanzano ad ogni frame; il campo cambia solo con il tempo di previsione selezionato. Tempo condiviso con grafici/viaggio, legenda in kn e attribuzione visibile.

Prove obbligatorie prima di mostrare «Campo vento»: rotazione con due dita, allineamento dopo pan/zoom, campionamento noto U/V, copertura e data corrente, rotta e barca leggibili, terra mascherata, riduzione del numero di particelle su smartphone, limite memoria, pausa in background, prefers-reduced-motion, assenza di richieste durante playback e disattivazione senza interferire con le tre modalità esistenti.

## Automazione predisposta (non attivata)

Il workflow `.github/workflows/wind-grid.yml` controlla la fonte ogni sei ore (00:17, 06:17, 12:17, 18:17 UTC; GitHub può ritardare o saltare esecuzioni). ICON-2I emette normalmente alle 00/12 UTC: quattro controlli non significano quattro nuove emissioni. La cache evita di scaricare nuovamente i circa 170 MB della stessa emissione, salvo scadenza/evizione.

`tools/wind-grid/automate.py` sceglie una directory ufficiale completa che copra ancora le prossime 48 ore, scarica U/V/FR_LAND con limite dimensione e verifica integrità, conserva SHA-256 e ora reale di acquisizione, e richiama il convertitore esistente. Produce 49 campi orari da adesso arrotondato all’ora successiva. Il sito contiene solo previsioni pubbliche, mai dati di account o file GRIB.

La pubblicazione controlla tutti i campi prima di sostituire `current.json`. Ogni file JSON ha SHA-256 nel nome e nel manifest: un URL non cambia contenuto. I file già prodotti nelle ultime 72 ore vengono conservati attraverso la cache del sito; GitHub può eliminarla, quindi il futuro lettore dovrà gestire file mancanti senza simulare dati. I file sono JSON non compressi, senza dipendenza da intestazioni gzip personalizzate su Pages. Un errore lascia online il precedente sito, che **non deve essere mostrato come aggiornato**: il futuro lettore dovrà verificare run, copertura e integrità.

### Attivazione richiesta al proprietario

1. Collegare il progetto in Lovable → Impostazioni progetto → Git → GitHub. Lovable crea un repository privato; l’assistente non può eseguire questo collegamento.
2. Nel repository, autorizzare Actions e impostare la variabile **WIND_GRID_ENABLED=true** (Settings → Secrets and variables → Actions → Variables). L’automazione resta spenta senza questa scelta.
3. Lanciare manualmente “Vento ICON-2I ogni sei ore” da Actions e verificare l’esito; anche senza hosting si ottiene l’artefatto `wind-grid-validated`.
4. Per la consegna pubblica, verificare disponibilità/costo di GitHub Pages sul proprio piano, scegliere **GitHub Actions** come sorgente in Settings → Pages e impostare **WIND_GRID_PAGES=true**. La pubblicazione contiene esclusivamente i dati meteo, non l’app. Se Pages non è disponibile sul piano del repository privato, non rendere pubblico l’intero codice per aggirare il limite: scegliere prima un hosting separato.
5. Dopo il primo deploy, comunicare l’URL Pages e verificare `current.json`, tutte le 49 URL, lettura cross-origin dall’app e freschezza. Solo dopo si può collegare e provare il layer animato.

Nessuna chiave personale necessaria: Actions usa il suo token temporaneo con soli permessi di lettura e, nel job di pubblicazione, Pages/OIDC. Nessun acquisto o servizio esterno attivato. **Gratuità non garantita**: Actions su repository privati consuma la quota del piano, e Pages privato dipende dal piano GitHub. Verificare limiti e spesa prima di abilitare; un repository pubblico dedicato ai soli dati è una possibile scelta futura, non predisposta automaticamente.

Test locali: `python -B -m unittest discover -s tools/wind-grid -p 'test_*.py' -v`. Prova completa esterna: `python -B tools/wind-grid/automate.py --cache /tmp/wind-cache --site /tmp/wind-site`. La verifica locale non dimostra che il workflow sia già in esecuzione su GitHub.

**Dipendenza aperta:** il proprietario ha confermato che GitHub non è ancora collegato; attivazione Actions, hosting Pages e URL pubblico restano da completare. Il campo geografico nell’app resta disattivato, senza modificare animato/viaggio/grafici esistenti.