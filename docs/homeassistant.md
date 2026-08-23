# Sprössling in Home Assistant

NFC-Tag am Wickeltisch antippen, Windel ist geloggt – ohne das Handy zu
entsperren. Dazu ein paar Sensoren, die zeigen, was gerade los ist.

## Token anlegen

**Mehr → Automationen & API → Tokens.** Namen vergeben, „Anlegen“. Der Token
steht genau einmal da; gespeichert ist nur sein Hash. Wer ihn verliert, legt
einen neuen an und widerruft den alten.

Ein Token gehört zu einem Haushalt und zu der Person, die ihn anlegt. Einträge
darüber erscheinen mit ihrem Namen und dem Vermerk „Automation“.

## In `secrets.yaml`

```yaml
sproessling_url: "https://sproessling.example.org"
sproessling_token: "sp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Endpunkte

Alle unter `/api/v1`, Authentifizierung als `Authorization: Bearer <token>`.
Session-Cookies werden nicht akzeptiert, CORS ist aus, 60 Anfragen pro Minute
je Token. Jeder Zugriff steht im Zugriffsprotokoll in den Einstellungen.

Ohne `?kind=<id>` gilt immer das erste Kind des Haushalts.

### Ereignis anlegen

```bash
curl -X POST "$URL/api/v1/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"diaper","wet":true,"soiled":false}'
```

```json
{ "id": "cm...", "type": "diaper", "at": "2026-11-04T09:12:00.000Z" }
```

`at` ist optional (ISO 8601, Standard jetzt). `type` nimmt alle Ereignistypen
der App **und** die Gesundheits-Arten direkt an – `temperature`, `medication`,
`symptom`, `allergy`, `vaccination`, `appointment`. Die Liste wird aus der
Ereignis-Registry der App abgeleitet; kommt dort etwas dazu, kann die API es
sofort.

Ein paar Beispiele:

```bash
# Temperatur
-d '{"type":"temperature","temperatureC":38.4,"measuredAt":"ear"}'

# Medikament mit selbst gesetztem Intervall
-d '{"type":"medication","medication":"Nurofen","doseMl":4,"repeatHours":6}'

# Flasche
-d '{"type":"bottle","content":"formula","amountMl":120}'
```

Kommt gleichzeitig ein Eintrag von Hand dazu, meldet die Antwort das mit
`moeglichesDuplikat` – die Duplikatsprüfung läuft über die API genauso wie in
der App.

### Zustand abfragen

```bash
curl "$URL/api/v1/status" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "kind": { "id": "cm...", "name": "Lina" },
  "laufenderTimer": { "type": "sleep", "seit": "2026-11-04T12:40:00.000Z" },
  "letzteMahlzeit": { "type": "nursing", "at": "2026-11-04T11:05:00.000Z" },
  "letzterSchlaf": { "von": "...", "bis": "...", "laeuft": false },
  "wachSeitMinuten": 95,
  "naechstesSchlaffenster": { "von": "...", "bis": "...", "konfidenz": 0.72, "kalibriert": true },
  "windelnHeute": 5,
  "fieber": { "aktiv": false }
}
```

Läuft gerade eine Fieberepisode, steht unter `fieber` zusätzlich die letzte
Temperatur mit Zeitpunkt und der Zeitpunkt, ab dem die nächste Dosis nach dem
selbst eingetragenen Intervall möglich wäre.

### Timer

```bash
curl -X POST "$URL/api/v1/timer/sleep/start" -H "Authorization: Bearer $TOKEN"
curl -X POST "$URL/api/v1/timer/sleep/stop"  -H "Authorization: Bearer $TOKEN"
```

Läuft schon einer, antwortet der Start mit `409` – doppelte Schlafblöcke
entstehen so nicht.

## `configuration.yaml`

```yaml
rest_command:
  sproessling_schlaf_start:
    url: !secret sproessling_schlaf_start_url
    method: post
    headers:
      Authorization: !secret sproessling_auth

  sproessling_schlaf_stop:
    url: !secret sproessling_schlaf_stop_url
    method: post
    headers:
      Authorization: !secret sproessling_auth
```

Dazu in `secrets.yaml`:

```yaml
sproessling_auth: "Bearer sp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
sproessling_events_url: "https://sproessling.example.org/api/v1/events"
sproessling_status_url: "https://sproessling.example.org/api/v1/status"
sproessling_schlaf_start_url: "https://sproessling.example.org/api/v1/timer/sleep/start"
sproessling_schlaf_stop_url: "https://sproessling.example.org/api/v1/timer/sleep/stop"
```

Und die Windel-Aktion:

```yaml
rest_command:
  sproessling_windel:
    url: !secret sproessling_events_url
    method: post
    headers:
      Authorization: !secret sproessling_auth
      Content-Type: application/json
    payload: '{"type":"diaper","wet":{{ wet | default(true) | tojson }},"soiled":{{ soiled | default(false) | tojson }}}'
```

## Sensoren

```yaml
rest:
  - resource: !secret sproessling_status_url
    headers:
      Authorization: !secret sproessling_auth
    scan_interval: 300
    sensor:
      - name: "Sprössling wach seit"
        value_template: "{{ value_json.wachSeitMinuten }}"
        unit_of_measurement: "min"
        unique_id: sproessling_wach_seit

      - name: "Sprössling Windeln heute"
        value_template: "{{ value_json.windelnHeute }}"
        unique_id: sproessling_windeln_heute

      - name: "Sprössling nächstes Schlaffenster"
        value_template: "{{ value_json.naechstesSchlaffenster.von | default('unbekannt') }}"
        device_class: timestamp
        unique_id: sproessling_schlaffenster

      - name: "Sprössling Temperatur"
        value_template: "{{ value_json.fieber.temperaturC | default('unknown') }}"
        unit_of_measurement: "°C"
        device_class: temperature
        unique_id: sproessling_temperatur

    binary_sensor:
      - name: "Sprössling schläft"
        value_template: "{{ value_json.laufenderTimer.type | default('') == 'sleep' }}"
        unique_id: sproessling_schlaeft
```

`scan_interval: 300` reicht: das Limit liegt bei 60 Anfragen pro Minute, aber
fünf Minuten sind für alles hier genau genug und schonen den Server.

## NFC-Tag am Wickeltisch

Tag in der Home-Assistant-App beschreiben, dann:

```yaml
automation:
  - alias: "Wickeltisch-Tag: Windel eintragen"
    mode: single
    triggers:
      - trigger: tag
        tag_id: PUT-YOUR-TAG-ID-HERE
    actions:
      - action: rest_command.sproessling_windel
        data:
          wet: true
          soiled: false
      - action: notify.mobile_app_handy
        data:
          message: "Windel eingetragen"
```

Zwei Tags nebeneinander sind praktischer als einer mit Auswahl: einer für nass,
einer für voll. Beim zweiten `soiled: true` setzen.

## Webhook zurück in Home Assistant

**Mehr → Automationen & API → Webhooks.** Adresse eintragen, optional auf
einzelne Ereignistypen einschränken. Sprössling schickt bei jedem Ereignis über
die API einen POST, drei Versuche mit wachsendem Abstand; scheitert es
endgültig, steht der Fehler beim Webhook in den Einstellungen.

```json
{
  "art": "event.created",
  "type": "diaper",
  "eventId": "cm...",
  "childId": "cm...",
  "at": "2026-11-04T09:12:00.000Z",
  "quelle": "Automation"
}
```

In Home Assistant:

```yaml
automation:
  - alias: "Sprössling: Ereignis empfangen"
    triggers:
      - trigger: webhook
        webhook_id: sproessling
        allowed_methods: [POST]
        local_only: true
    actions:
      - action: logbook.log
        data:
          name: "Sprössling"
          message: "{{ trigger.json.type }} um {{ trigger.json.at }}"
```

## Wenn etwas nicht geht

| Antwort | Bedeutung |
|---|---|
| `401` | Token fehlt, ist falsch oder widerrufen |
| `404` | Kein Kind im Haushalt, oder `?kind=` zeigt auf ein fremdes |
| `409` | Timer läuft schon bzw. läuft gerade nicht |
| `429` | Mehr als 60 Anfragen in einer Minute – `Retry-After` sagt, wie lange |

Die letzten Zugriffe stehen in den Einstellungen unter **Automationen & API**;
dort ist auch zu sehen, ob ein Token je benutzt wurde.
