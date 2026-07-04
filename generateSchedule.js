const SHEETS = ["Session", "Speaker", "SessionType", "Room", "Tag"]

function parseCsv(csv) {
  const rows = []
  let row = []
  let cell = ""
  let quoted = false

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i]

    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(cell)
      cell = ""
    } else if (char === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else if (char !== "\r") {
      cell += char
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

function csvToObjects(csv) {
  const [headers = [], ...rows] = parseCsv(csv)
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || null])))
}

async function fetchSheetGids(spreadsheetKey) {
  for (const url of [
    `https://docs.google.com/spreadsheets/d/${spreadsheetKey}/edit?usp=sharing`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetKey}/pubhtml`,
  ]) {
    const response = await fetch(url)
    if (response.ok) {
      const gids = parseSheetGids(await response.text())
      if (Object.keys(gids).length > 0) {
        return gids
      }
    }
  }

  throw new Error("Failed to find sheet metadata. Share the spreadsheet publicly or publish it to the web.")
}

function parseSheetGids(html) {
  const gids = {}

  for (const match of html.matchAll(/items\.push\(\{name: "([^"]+)"[\s\S]*?gid: "(-?\d+)"/g)) {
    gids[match[1]] = match[2]
  }

  for (const match of html.matchAll(/\[(?:\d+),0,\\"(-?\d+)\\",\[\{\\"1\\":\[\[0,0,\\"([^\\]+?)\\"/g)) {
    gids[match[2]] = match[1]
  }

  return gids
}

async function fetchSheet(spreadsheetKey, sheet, gid) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetKey}/export`)
  url.searchParams.set("format", "csv")
  url.searchParams.set("gid", gid)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sheet}: ${response.status} ${response.statusText}`)
  }

  return csvToObjects(await response.text())
}

async function fetchSheets(spreadsheetKey) {
  const gids = await fetchSheetGids(spreadsheetKey)
  const entries = await Promise.all(
    SHEETS.map(async (sheet) => {
      if (gids[sheet] == null) {
        throw new Error(`Published spreadsheet is missing sheet: ${sheet}`)
      }
      return [sheet, await fetchSheet(spreadsheetKey, sheet, gids[sheet])]
    })
  )
  return Object.fromEntries(entries)
}

function nullCoalesce(value) {
  return value == null ? "" : value
}

async function generateSchedule(config) {
  const data = await fetchSheets(config.spreadsheetKey)
  data.Session.shift();
  data.Speaker.shift();

  data.Session.forEach((session) => {
    // title & description
    session.zh = {}
    session.zh.title = nullCoalesce(session.title_zh)
    session.zh.description = nullCoalesce(session.description_zh)

    session.en = {}
    session.en.title = nullCoalesce(session.title_en)
    session.en.description = nullCoalesce(session.description_en)

    delete session.title_zh
    delete session.description_zh
    delete session.title_en
    delete session.description_en

    // speaker
    session.speakers = []

    for (let i = 1; i <= 8; i++) {
      if (session['speaker' + i + 'id'] != null) {
        session.speakers.push(session['speaker' + i + 'id'])
      }

      delete session['speaker' + i]
      delete session['speaker' + i + 'id']
    }

    // broadcast
    if (session.broadcast != null) {
      session.broadcast = session.broadcast.split(',')
    }

    // tag
    session.tags = []

    for (let i = 1; i <= 5; i++) {
      if (session['tag' + i] != null) {
        session.tags.push(session['tag' + i])
      }

      delete session['tag' + i]
    }
  })

  data.Speaker.forEach((speaker) => {
    speaker.avatar = speaker.avatar == undefined ? config.default_avatar : config.avatar_base_url + speaker.avatar

    speaker.zh = {}
    speaker.zh.name = nullCoalesce(speaker.name_zh)
    speaker.zh.bio = nullCoalesce(speaker.bio_zh)

    speaker.en = {}
    speaker.en.name = nullCoalesce(speaker.name_en)
    speaker.en.bio = nullCoalesce(speaker.bio_en)

    delete speaker.name_zh
    delete speaker.bio_zh
    delete speaker.name_en
    delete speaker.bio_en
  })

  data.SessionType.forEach((type) => {
    type.zh = {}
    type.zh.name = nullCoalesce(type.name_zh)
    type.zh.description = nullCoalesce(type.description_zh)

    type.en = {}
    type.en.name = nullCoalesce(type.name_en)
    type.en.description = nullCoalesce(type.description_en)

    delete type.name_zh
    delete type.name_en
    delete type.description_zh
    delete type.description_en
  })

  data.Room.forEach((room) => {
    room.zh = {}
    room.zh.name = nullCoalesce(room.name_zh)
    room.zh.description = nullCoalesce(room.description_zh)

    room.en = {}
    room.en.name = nullCoalesce(room.name_en)
    room.en.description = nullCoalesce(room.description_en)

    delete room.name_zh
    delete room.name_en
    delete room.description_zh
    delete room.description_en
  })

  data.Tag.forEach((tag) => {
    tag.zh = {}
    tag.zh.name = nullCoalesce(tag.name_zh)
    tag.zh.description = nullCoalesce(tag.description_zh)

    tag.en = {}
    tag.en.name = nullCoalesce(tag.name_en)
    tag.en.description = nullCoalesce(tag.description_en)

    delete tag.name_zh
    delete tag.name_en
    delete tag.description_zh
    delete tag.description_en
  })

  return JSON.stringify({
    "sessions": data.Session,
    "speakers": data.Speaker,
    "session_types": data.SessionType,
    "rooms": data.Room,
    "tags": data.Tag,
  })
}
module.exports = generateSchedule
module.exports._parseCsv = parseCsv
module.exports._parseSheetGids = parseSheetGids
