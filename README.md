# guardianAI

App di sicurezza urbana basata su community verificata e mappa geolocalizzata. L'utente segnala eventi (pericoli, furti, emergenze sanitarie, SOS personali) e la community locale riceve alert geolocalizzati in tempo reale — con moderazione forte, verifica identità e privacy by design.

## Visione di prodotto

guardianAI **non è** un clone di Citizen né Nextdoor, e **non sostituisce** il 112.

È un prodotto map-centric pensato per funzionare su scala di quartiere con residenti verificati, dove la qualità delle segnalazioni e la fiducia tra utenti contano più del volume. L'interfaccia principale è una mappa; tutto il resto (segnalazione, conferma, SOS, check-in) è un layer che interagisce con essa.

## Principi fondanti

- **Privacy by design** — Posizioni jitterate in pubblico, zona casa visibile solo all'utente, dati geografici criptati at-rest.
- **Verifica seria** — Identità tramite SPID o document scan + selfie. Niente PDF di certificati falsificabili.
- **Moderazione pesante** — Coda umana + automatica, reputation score, categorie strutturate per prevenire profiling discriminatorio.
- **Time decay** — Ogni segnalazione ha un TTL. La mappa non diventa un cimitero di pin che stigmatizza quartieri.
- **SOS ≠ Segnalazione** — Due flussi separati. L'SOS personale non finisce sul feed pubblico.

## Architettura (high level)

- **Mobile**: React Native + Mapbox GL (`@rnmapbox/maps`)
- **Backend**: Supabase (Postgres + PostGIS per query geospaziali native)
- **Realtime**: Supabase Realtime con filtro per geohash
- **Storage**: Supabase Storage (foto/audio segnalazioni con EXIF stripping)
- **Auth**: Supabase Auth + SPID/CIE per verifica identità
- **Push**: Firebase Cloud Messaging / Expo Notifications
- **Edge logic**: Supabase Edge Functions (moderazione, scadenze, fan-out notifiche)

## Categorie di segnalazione (v0)

- **Pericolo acuto** — TTL 2h
- **Evento / Segnalazione generica** — TTL 72h
- **Furto / Tentato furto** — TTL 24h, campi strutturati (no free-text descrittivo di persone)
- **SOS personale** — Flusso separato, non pubblico, notifica ai contatti fidati + shortcut 112

## Roadmap

### MVP (v0.1)

Zona pilota unica, utenti chiusi.

- Onboarding con verifica telefono + SPID
- Mappa home con pin + heatmap + time decay
- Segnalazione con 3 categorie principali + SOS separato
- Contatti fidati (2–5)
- Shortcut 112 sempre visibile
- Moderazione base (flag + coda umana)
- Rate limiting

### v0.2

- Foto/video con EXIF stripping
- Conferme/smentite community
- Reputation score
- Filtri mappa avanzati
- Notifiche granulari + digest settimanale

### v1.0 (B2B2C)

- Canale ufficiale Municipio / Polizia Locale
- Analytics dashboard per amministrazioni
- Gruppi verificati per via/quartiere
- Moderatori locali

## Rischi noti e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Diffamazione (art. 595 c.p.) | Categorie strutturate, no free-text su persone, moderazione NLP |
| Profiling discriminatorio | Divieto esplicito in guidelines, image moderation, ban pesante |
| Falsi allarmi | Sistema di verifica incrociata, reputation score |
| Responsabilità legale su emergenze | T&C chiari, disclaimer 112, DPIA GDPR |
| Densità a freddo | Launch per singolo quartiere, non città intera |

## Stato

Fase 0 — definizione prodotto e architettura. Nessun codice applicativo ancora scritto.

## Licenza

TBD
