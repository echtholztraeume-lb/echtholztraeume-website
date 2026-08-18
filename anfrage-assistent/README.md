# Echtholzträume Anfrage-Assistent

Status: **Test / Entwurfsmodus**

Der Assistent ist bewusst getrennt von der bestehenden Website-Oberfläche.
Er versendet keine E-Mails und verändert keine Kundenanfragen.

## Zielablauf

1. Neue Nachricht aus Gmail empfangen.
2. Nachricht klassifizieren: neue Projektanfrage / kein Neuprojekt / manuell prüfen.
3. Bereits vorhandene Projektdaten erkennen.
4. Nur fehlende Informationen bestimmen.
5. Eine persönliche Antwort als Entwurf vorbereiten.
6. Erst nach menschlicher Prüfung in Gmail als Entwurf anlegen bzw. später freigeben.

## Einheitliche Projektdaten

- Projektart
- Beschreibung
- Maße
- Material / Optik
- Ort / PLZ
- gewünschter Zeitraum
- Fotos / Pläne

Diese Struktur soll später auch für Website- und Instagram-Anfragen verwendet werden.

## Sicherheit

- Modus ist `draft_only`.
- Keine automatische Zusage zu Preis, Termin oder Machbarkeit.
- Unsichere Nachrichten werden als `manuell_pruefen` markiert.
- Lieferanten, Rechnungen, Bestellungen, Bewerbungen, Kooperationen und ähnliche Nachrichten sollen nicht automatisch beantwortet werden.

## API

`GET /api/anfrage-assistent` liefert Statusinformationen.

`POST /api/anfrage-assistent` akzeptiert testweise JSON mit z. B.:

```json
{
  "subject": "Anfrage Einbauschrank",
  "body": "Wir wünschen uns einen Einbauschrank in Eiche ...",
  "firstName": "Max",
  "attachments": []
}
```

Die Antwort enthält Klassifikation, erkannte Projektdaten, fehlende Felder und ggf. einen Antwortentwurf.

## Noch nicht aktiviert

Die dauerhafte Gmail-Ereignisanbindung und das automatische Erstellen von Gmail-Entwürfen benötigen eine serverseitige Google/Gmail-Autorisierung. Diese Zugangsdaten gehören ausschließlich in geschützte Umgebungsvariablen und niemals ins Repository.
