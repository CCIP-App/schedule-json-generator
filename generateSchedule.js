const SHEETS = ["Session", "Speaker", "SessionType", "Room", "Tag"]
const REQUIRED_COLUMNS = {
  Session: ["title_zh", "description_zh", "title_en", "description_en", "speaker1id", "tag1"],
  Speaker: ["name_zh", "bio_zh", "name_en", "bio_en"],
  SessionType: ["name_zh", "description_zh", "name_en", "description_en"],
  Room: ["name_zh", "description_zh", "name_en", "description_en"],
  Tag: ["name_zh", "description_zh", "name_en", "description_en"],
}

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

  const body = await response.text()
  if (/^\s*<!doctype html/i.test(body) || /^\s*<html/i.test(body)) {
    throw new Error(`Failed to fetch ${sheet} as CSV. Share the spreadsheet publicly or publish it to the web.`)
  }

  return csvToObjects(body)
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

function validateConfig(config) {
  if (config == null || typeof config !== "object") {
    throw new Error("Config must be an object.")
  }

  for (const key of ["spreadsheetKey", "default_avatar", "avatar_base_url"]) {
    if (typeof config[key] !== "string" || config[key] === "") {
      throw new Error(`Config field ${key} must be a non-empty string.`)
    }
  }
}

function validateSheetShape(data) {
  for (const sheet of SHEETS) {
    if (!Array.isArray(data[sheet])) {
      throw new Error(`Spreadsheet data is missing sheet: ${sheet}`)
    }

    if ((sheet === "Session" || sheet === "Speaker") && data[sheet].length === 0) {
      throw new Error(`${sheet} sheet must include the first human-readable note row.`)
    }

    const firstRow = data[sheet][0] || {}
    const missing = REQUIRED_COLUMNS[sheet].filter((column) => !Object.hasOwn(firstRow, column))
    if (missing.length > 0) {
      throw new Error(`${sheet} sheet is missing required column(s): ${missing.join(", ")}`)
    }
  }
}

function localizeNameDescription(row) {
  row.zh = {}
  row.zh.name = nullCoalesce(row.name_zh)
  row.zh.description = nullCoalesce(row.description_zh)

  row.en = {}
  row.en.name = nullCoalesce(row.name_en)
  row.en.description = nullCoalesce(row.description_en)

  delete row.name_zh
  delete row.name_en
  delete row.description_zh
  delete row.description_en
}

async function generateScheduleObject(config) {
  validateConfig(config)
  const data = await fetchSheets(config.spreadsheetKey)
  validateSheetShape(data)
  data.Session.shift()
  data.Speaker.shift()

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

    for (let i = 1; i <= 10; i++) {
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

    for (let i = 1; i <= 10; i++) {
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

  data.SessionType.forEach(localizeNameDescription)
  data.Room.forEach(localizeNameDescription)
  data.Tag.forEach(localizeNameDescription)

  return {
    sessions: data.Session,
    speakers: data.Speaker,
    session_types: data.SessionType,
    rooms: data.Room,
    tags: data.Tag,
  }
}

async function generateSchedule(config) {
  return JSON.stringify(await generateScheduleObject(config))
}
module.exports = generateSchedule
module.exports.generateScheduleObject = generateScheduleObject
module.exports._parseCsv = parseCsv
module.exports._parseSheetGids = parseSheetGids
module.exports._validateSheetShape = validateSheetShape
