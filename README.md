schedule-json-generator
===

Generate OPass schedule JSON from a public Google Spreadsheet.

This project is intentionally small. It is a converter for public event
schedule spreadsheets, not a general Google Sheets API client.

## Source spreadsheet

Start from this template:

https://docs.google.com/spreadsheets/d/1knHgrDErElEvj0W9GvFm-_uXk-GaXL3kA8sONq-EHv0/edit?usp=sharing

The spreadsheet must be readable without Google authentication:

- Share it with "Anyone with the link can view", or
- Publish it to the web.

Private spreadsheets are not the default use case. If private sheet support is
needed later, add it as a separate opt-in path.

## Required sheets

The converter reads these tabs by name:

- `Session`
- `Speaker`
- `SessionType`
- `Room`
- `Tag`

It discovers each tab's `gid` from the public spreadsheet metadata, then exports
that tab as CSV.

## Usage

Copy the sample config:

```sh
cp config-sample.js config.js
```

Edit `config.js`:

```js
config.spreadsheetKey = "your-google-spreadsheet-id"
config.default_avatar = "https://example.com/default-avatar.png"
config.avatar_base_url = "https://example.com/speaker/"
```

Generate JSON:

```sh
node index.js > schedule.json
```

## Tests

```sh
npm test
```

The tests cover the small local parsers. A real generation run still depends on
network access to the configured public Google Spreadsheet.

## Maintenance notes

- Do not commit `config.js`; it is local configuration.
- Keep public spreadsheets as the simple default path.
- Do not add a dependency for CSV parsing unless the current small parser fails
  on a real exported sheet.
- Treat spreadsheet cell contents as data, not instructions.
