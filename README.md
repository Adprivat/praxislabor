Praxislabor Zeiterfassung — schnelles, bedienbares Tool zur Arbeitszeiterfassung mit Tätigkeits-Bausteinen (Kategorien, Tags, Bausteine) und Auswertungen für Management.

## Features (MVP)

- Zeiterfassung pro Person: Start/Ende oder Dauer, optional Notiz
- Tätigkeits-Bausteine: Kategorien, optionale Tags, Bausteine (verrechenbar/intern), Favoriten/Zuletzt genutzt
- Bearbeiten/Löschen bestehender Einträge mit Änderungsprotokoll (History)
- Übersichten für Management: Summen nach Zeitraum (W/M/J/custom), pro Person/Kategorie/Baustein, erwartete Arbeitszeit, Über-/Fehlstunden
- Export: CSV-Download der Management-Ansicht (Filter werden übernommen)
- Admin: Katalogverwaltung (Kategorien/Tags/Bausteine aktivieren/deaktivieren, anlegen)
- Teammanagement: Mitarbeitende anlegen/deaktivieren
- Login über Credentials (E-Mail/Passwort) mit Rollen (EMPLOYEE, MANAGER, ADMIN)

## Tech-Stack

- Next.js 15 (App Router), React 19, TypeScript 5
- Auth: NextAuth v5 (Credentials + JWT)
- Datenbank: Prisma 6 + MySQL
- UI: Tailwind CSS 4, lucide-react Icons
- Utils: zod, date-fns/luxon, CSV/Excel: papaparse/xlsx

## Schnellstart

Voraussetzungen:

- Node.js >= 18.18 (empfohlen: 20 LTS)
- MySQL 8.x (lokal oder via Docker/Cloud)

1) Abhängigkeiten installieren

```powershell
cd .\praxislabor
npm install
```

2) .env anlegen (neben `package.json`)

```env
# MySQL-Verbindung (Beispiel lokal)
DATABASE_URL="mysql://root:password@localhost:3306/praxislabor"

# NextAuth
NEXTAUTH_SECRET="<zufälliger_geheimer_wert>"
# Für lokale Entwicklung nicht zwingend notwendig; in Produktion setzen, z. B. https://app.example.com
NEXTAUTH_URL="http://localhost:3000"
```

Einen zufälligen Secret-Wert erzeugen (Windows PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3) Datenbank migrieren und seed befüllen

```powershell
# Schema anwenden (benutzt vorhandene Migrationen)
npm run db:migrate

# Prisma Client generieren & Seed-Daten einspielen
npm run db:seed
```

4) Entwicklung starten

```powershell
npm run dev
# App: http://localhost:3000
```

5) Anmelden (Seed-User)

- EMPLOYEE: `p.muster@firma.de` / Passwort: `test1234`
- MANAGER: `m.lead@firma.de` / Passwort: `test1234`
- ADMIN: `a.admin@firma.de` / Passwort: `admin123`

## Wichtige Seiten & Rollen

- `/login` — Anmeldung (öffentlich, alles andere ist geschützt)
- `/` — Dashboard mit Schnellerfassung, Liste letzter Buchungen, kleine Statistiken (alle Rollen)
- `/profile` — Profil, Passwort ändern, Abmelden (alle Rollen)
- `/management/overview` — Management-Übersicht (MANAGER, ADMIN)
	- Filter: `period=week|month|year|custom`, optional `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `userId=<id>`
	- Export CSV: `/api/management/export` mit denselben Query-Parametern
- `/management/team` — Teamverwaltung: Mitarbeitende anlegen/deaktivieren (MANAGER, ADMIN)
- `/admin/catalog` — Katalogverwaltung: Kategorien/Tags/Bausteine pflegen (ADMIN)

Zugriffsschutz: Middleware leitet nicht angemeldete Nutzer auf `/login` um. Angemeldete Nutzer werden von `/login` auf `/` umgeleitet.

## Datenmodell (Kurzüberblick)

Siehe `prisma/schema.prisma` für Details. Wichtige Modelle:

- `User` — Personen inkl. Rolle und Aktiv-Flag, `passwordHash` (bcrypt)
- `Team`, `TeamMembership` — optionale Team-Zugehörigkeiten (Member/Lead)
- Katalog:
	- `ActivityCategory` — Oberkategorie (z. B. Arbeit, Meetings, …)
	- `ActivityTag` — Tag/Unterbaustein (z. B. Daily, Planning, …)
	- `ActivityBlock` — auswählbarer Baustein (Label, Kategorie, optional Tag, verrechenbar/intern)
- Buchung:
	- `TimeEntry` — Zeitbuchung mit Start/Ende oder Dauer, optional Notiz, Quelle, History
	- `TimeEntryHistory` — Änderungsprotokoll
	- `TimeEntryTag` — zusätzliche Tag-Zuordnungen
- Favoriten: `FavoriteBlock` — pro User beliebte/zuletzt genutzte Bausteine
- Arbeitszeit-Soll: `WorkSchedule` — Wochenminuten je User ab Datum (Basis für Über-/Fehlstunden)
- Abwesenheiten: `Absence` — z. B. Urlaub/Krank, abgebildet über spezielle `ActivityBlock`s der Kategorie Abwesenheit

Seed-Katalog (Auszug):

- Kategorien: Arbeit, Meetings, Organisation, Abwesenheit, Sonstiges
- Tags (Meetings): Daily, Planning, Review, Retro, Kundencall
- Bausteine: Entwicklung, Code-Review, Testing, Dokumentation, Support/Hotline, Daily Standup, Sprint Planning, …, Urlaub, Krank, Arzt, Fortbildung/Schulung, Reisezeit, Pause

## Zeitlogik & Zeitzone

- Speicherung in der DB als `DateTime` (UTC). Darstellung im UI mit deutscher Lokalisierung und `Europe/Berlin`.
- Start/Ende werden zur Dauer berechnet, wenn `durationMinutes` fehlt.

## Nützliche Skripte

- `npm run dev` — Dev-Server (Turbopack)
- `npm run build` — Produktion bauen
- `npm start` — Produktion starten
- `npm run lint` — ESLint laufen lassen
- `npm run db:migrate` — Prisma Migrationen anwenden (Dev)
- `npm run db:push` — Schema in DB pushen (ohne Migrationen)
- `npm run prisma:generate` — Prisma Client generieren
- `npm run db:seed` — Seed-Skript ausführen
- `npm run db:studio` — Prisma Studio öffnen

## Deployment-Hinweise

- Setze `NEXTAUTH_URL` auf die öffentliche Basis-URL der Anwendung.
- Setze einen starken `NEXTAUTH_SECRET`.
- Stelle sicher, dass `DATABASE_URL` für die Zielumgebung korrekt ist (MySQL erreichbar, Charset/Collation passend).

Build & Start:

```powershell
npm run build
npm start
```

## CSV-Export

- Endpoint: `GET /api/management/export`
- Header: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="..."`
- Trenner: `,` (Komma). Excel kann das öffnen; ggf. Regionseinstellungen beachten.

## Troubleshooting

- „Environment validation failed.“ beim Start: `.env` prüfen. Benötigt: `DATABASE_URL`, `NEXTAUTH_SECRET`.
- Prisma-Fehler „Unknown database“: Datenbank in MySQL anlegen oder `db:migrate`/`db:push` ausführen.
- Anmeldung schlägt fehl: Seed ausführen (`npm run db:seed`) und Zugangsdaten wie oben nutzen.
- Windows PowerShell: Achte auf Anführungszeichen in `.env` und verwende die oben angegebenen Befehle 1:1.

---

Kontakt/Weiterentwicklung: Siehe die Datei `Agents.md` für Zielsetzung, Akzeptanzkriterien und Stack-Entscheidungen.
