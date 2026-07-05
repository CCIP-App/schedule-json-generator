const assert = require("node:assert/strict")
const test = require("node:test")
const generateSchedule = require("../generateSchedule")

const SHEET_METADATA =
  'items.push({name: "Session", gid: "0"});items.push({name: "Speaker", gid: "1"});items.push({name: "SessionType", gid: "2"});items.push({name: "Room", gid: "3"});items.push({name: "Tag", gid: "4"});'

async function withMockSheets(csvByGid, callback) {
  const originalFetch = global.fetch
  global.fetch = async (input) => {
    const url = new URL(String(input))
    if (!url.pathname.endsWith("/export")) {
      return { ok: true, text: async () => SHEET_METADATA }
    }

    return { ok: true, text: async () => csvByGid[url.searchParams.get("gid")] }
  }

  try {
    return await callback()
  } finally {
    global.fetch = originalFetch
  }
}

test("parseCsv handles quoted commas, quotes, and empty cells", () => {
  assert.deepEqual(generateSchedule._parseCsv('a,b,c\n"1,2","x""y",\n'), [
    ["a", "b", "c"],
    ["1,2", 'x"y', ""],
  ])
})

test("parseSheetGids reads published sheet names and gids", () => {
  const html = 'items.push({name: "Session", pageUrl: "x", gid: "0"});items.push({name: "Speaker", pageUrl: "x", gid: "1162046403"});'
  assert.deepEqual(generateSchedule._parseSheetGids(html), {
    Session: "0",
    Speaker: "1162046403",
  })
})

test("parseSheetGids reads public edit page sheet names and gids", () => {
  const html = '[21350203,"[0,0,\\"0\\",[{\\"1\\":[[0,0,\\"Session\\"]]}]"]],[21350203,"[1,0,\\"1162046403\\",[{\\"1\\":[[0,0,\\"Speaker\\"]]}]"]]'
  assert.deepEqual(generateSchedule._parseSheetGids(html), {
    Session: "0",
    Speaker: "1162046403",
  })
})

test("generateScheduleObject builds OPass JSON shape from all public sheet tabs", async () => {
  await withMockSheets(
    {
      0: "title_zh,description_zh,title_en,description_en,speaker1,speaker1id,tag1,broadcast\nnote,note,note,note,note,note,note,note\n講題,說明,Title,Description,Alice,alice,web,\"youtube,live\"\n",
      1: "avatar,name_zh,bio_zh,name_en,bio_en\nnote,note,note,note,note\nalice.png,Alice zh,Bio zh,Alice,Bio\n",
      2: "name_zh,description_zh,name_en,description_en\n議程,類型說明,Session,Type description\n",
      3: "name_zh,description_zh,name_en,description_en\n大廳,場地說明,Hall,Room description\n",
      4: "name_zh,description_zh,name_en,description_en\nWeb,標籤說明,Web,Tag description\n",
    },
    async () => {
      const schedule = await generateSchedule.generateScheduleObject({
        spreadsheetKey: "public-sheet",
        default_avatar: "https://example.com/default.png",
        avatar_base_url: "https://example.com/speakers/",
      })

      assert.equal(schedule.sessions.length, 1)
      assert.equal(schedule.speakers.length, 1)
      assert.equal(schedule.session_types.length, 1)
      assert.equal(schedule.rooms.length, 1)
      assert.equal(schedule.tags.length, 1)
      assert.deepEqual(schedule.sessions[0].zh, { title: "講題", description: "說明" })
      assert.deepEqual(schedule.sessions[0].speakers, ["alice"])
      assert.deepEqual(schedule.sessions[0].tags, ["web"])
      assert.deepEqual(schedule.sessions[0].broadcast, ["youtube", "live"])
      assert.equal(schedule.speakers[0].avatar, "https://example.com/speakers/alice.png")
    }
  )
})

test("generateSchedule keeps the existing JSON string API", async () => {
  await withMockSheets(
    {
      0: "title_zh,description_zh,title_en,description_en,speaker1id,tag1\nnote,note,note,note,note,note\n",
      1: "avatar,name_zh,bio_zh,name_en,bio_en\nnote,note,note,note,note\n",
      2: "name_zh,description_zh,name_en,description_en\n議程,說明,Session,Description\n",
      3: "name_zh,description_zh,name_en,description_en\n大廳,說明,Hall,Description\n",
      4: "name_zh,description_zh,name_en,description_en\nWeb,說明,Web,Description\n",
    },
    async () => {
      const schedule = JSON.parse(
        await generateSchedule({
          spreadsheetKey: "public-sheet",
          default_avatar: "https://example.com/default.png",
          avatar_base_url: "https://example.com/speakers/",
        })
      )
      assert.deepEqual(Object.keys(schedule), ["sessions", "speakers", "session_types", "rooms", "tags"])
    }
  )
})

test("validateSheetShape reports the sheet and missing required columns", () => {
  assert.throws(
    () =>
      generateSchedule._validateSheetShape({
        Session: [{ title_zh: "" }],
        Speaker: [{ avatar: "", name_zh: "", bio_zh: "", name_en: "", bio_en: "" }],
        SessionType: [{ name_zh: "", description_zh: "", name_en: "", description_en: "" }],
        Room: [{ name_zh: "", description_zh: "", name_en: "", description_en: "" }],
        Tag: [{ name_zh: "", description_zh: "", name_en: "", description_en: "" }],
      }),
    /Session sheet is missing required column\(s\): description_zh/
  )
})

test("validateSheetShape requires Session and Speaker note rows", () => {
  assert.throws(
    () =>
      generateSchedule._validateSheetShape({
        Session: [],
        Speaker: [{ avatar: "", name_zh: "", bio_zh: "", name_en: "", bio_en: "" }],
        SessionType: [{ name_zh: "", description_zh: "", name_en: "", description_en: "" }],
        Room: [{ name_zh: "", description_zh: "", name_en: "", description_en: "" }],
        Tag: [{ name_zh: "", description_zh: "", name_en: "", description_en: "" }],
      }),
    /Session sheet must include the first human-readable note row/
  )
})

test("generateScheduleObject reports invalid config before fetching", async () => {
  await assert.rejects(
    () => generateSchedule.generateScheduleObject({ spreadsheetKey: "", default_avatar: "", avatar_base_url: "" }),
    /Config field spreadsheetKey must be a non-empty string/
  )
})

test("fetchSheet reports Google HTML responses instead of parsing them as CSV", async () => {
  await withMockSheets(
    {
      0: "<!doctype html><html><title>Sign in</title></html>",
      1: "<!doctype html><html><title>Sign in</title></html>",
      2: "<!doctype html><html><title>Sign in</title></html>",
      3: "<!doctype html><html><title>Sign in</title></html>",
      4: "<!doctype html><html><title>Sign in</title></html>",
    },
    async () => {
      await assert.rejects(
        () =>
          generateSchedule.generateScheduleObject({
            spreadsheetKey: "private-sheet",
            default_avatar: "https://example.com/default.png",
            avatar_base_url: "https://example.com/speakers/",
          }),
        /Failed to fetch .* as CSV/
      )
    }
  )
})
