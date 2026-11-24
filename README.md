# Adriatic Port Pilot

Crea una web app mobile-first (installabile come PWA) chiamata "Rotta Adriatica", per diportisti, charter e scuole vela in Adriatico. Stile marino elegante, blu profondo e bianco, font leggibile al sole, modalità scura. Lingua italiana, predisposta per l'inglese.

FUNZIONI:

1. MAPPA UNICA (Leaflet + OpenStreetMap con livello OpenSeaMap): porti, marina e ormeggi con marker. Tocco sul marker = scheda con servizi, contatti, tariffe, profondità, disponibilità. Filtri per regione, tariffa e servizi.

2. PROFILO BARCA: lunghezza, larghezza, pescaggio. La mappa nasconde o segnala i porti e gli ormeggi non adatti.

3. PIANIFICA LA TRATTA: l'utente sceglie partenza e arrivo; l'app mostra meteo e mare lungo il percorso (Open-Meteo Marine API: vento, raffiche, onde), maree e avvisi attivi nella zona.

4. AVVISI AI NAVIGANTI: elenco filtrabile per zona e data. Inserimento da pannello admin (titolo, testo, zona, scadenza, link alla fonte ufficiale).

5. ALLERTE PERSONALIZZATE: soglia di vento e onda, zone preferite, avvisi nuovi. Notifiche push web ed email.

6. CONFRONTO TARIFFE: tabella ordinabile di ormeggi per prezzo, lunghezza e stagione.

AREA GESTORI (marina, cantieri, rimessaggi): registrazione, scheda a pagamento modificabile (foto, tariffe, disponibilità, contatti), badge "Verificato".

ACCOUNT E PAGAMENTI: Supabase per login, database e ruoli (utente, gestore, admin). Stripe: piano gratuito (mappa e schede base), piano Skipper a 4,99 €/mese (allerte, pianificazione, profilo barca), piano Gestore per le schede, piano Flotta per charter e scuole con più utenti.

DATI INIZIALI: popola con 15 porti di esempio tra Venezia, Chioggia, Caorle, Trieste e Pola, con dati realistici ma segnati come "da verificare".

Parti da mappa, schede porto, meteo e profilo barca; poi aggiungi allerte, area gestori e pagamenti.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://adriatic-port-pilot.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fda7cc43-211d-4f1e-8e17-bda8f510a939).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
