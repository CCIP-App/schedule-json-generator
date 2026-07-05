import assert from "node:assert/strict"
import test from "node:test"
import generateSchedule, { generateScheduleObject } from "../generateSchedule.js"

const SHEET_METADATA =
  'items.push({name: "Session", gid: "0"});items.push({name: "Speaker", gid: "1"});items.push({name: "SessionType", gid: "2"});items.push({name: "Room", gid: "3"});items.push({name: "Tag", gid: "4"});'
const EDIT_PAGE_METADATA =
  '[[0,0,\\"0\\",[{\\"1\\":[[0,0,\\"Session\\"]]}]"],[1,0,\\"1\\",[{\\"1\\":[[0,0,\\"Speaker\\"]]}]"],[2,0,\\"2\\",[{\\"1\\":[[0,0,\\"SessionType\\"]]}]"],[3,0,\\"3\\",[{\\"1\\":[[0,0,\\"Room\\"]]}]"],[4,0,\\"4\\",[{\\"1\\":[[0,0,\\"Tag\\"]]}]"]]'

async function withMockFetch(mockFetch, callback) {
  const originalFetch = global.fetch
  global.fetch = mockFetch

  try {
    return await callback()
  } finally {
    global.fetch = originalFetch
  }
}

async function withMockSheets(csvByGid, callback, metadata = SHEET_METADATA) {
  return withMockFetch(async (input) => {
    const url = new URL(String(input))
    if (!url.pathname.endsWith("/export")) {
      return { ok: true, text: async () => metadata }
    }

    return { ok: true, text: async () => csvByGid[url.searchParams.get("gid")] }
  }, callback)
}

test("generateScheduleObject builds OPass JSON shape from all public sheet tabs", async () => {
  await withMockSheets(
    {
      0: 'title_zh,description_zh,title_en,description_en,speaker1,speaker1id,tag1,broadcast\nnote,note,note,note,note,note,note,note\n"講,題","說""明",,,Alice,alice,web,"youtube,live"\n',
      1: "avatar,name_zh,bio_zh,name_en,bio_en\nnote,note,note,note,note\nalice.png,Alice zh,Bio zh,Alice,Bio\n",
      2: "name_zh,description_zh,name_en,description_en\n議程,類型說明,Session,Type description\n",
      3: "name_zh,description_zh,name_en,description_en\n大廳,場地說明,Hall,Room description\n",
      4: "name_zh,description_zh,name_en,description_en\nWeb,標籤說明,Web,Tag description\n",
    },
    async () => {
      const schedule = await generateScheduleObject({
        spreadsheetKey: "public-sheet",
        default_avatar: "https://example.com/default.png",
        avatar_base_url: "https://example.com/speakers/",
      })

      assert.equal(schedule.sessions.length, 1)
      assert.equal(schedule.speakers.length, 1)
      assert.equal(schedule.session_types.length, 1)
      assert.equal(schedule.rooms.length, 1)
      assert.equal(schedule.tags.length, 1)
      assert.deepEqual(schedule.sessions[0].zh, { title: "講,題", description: '說"明' })
      assert.deepEqual(schedule.sessions[0].en, { title: "", description: "" })
      assert.deepEqual(schedule.sessions[0].speakers, ["alice"])
      assert.deepEqual(schedule.sessions[0].tags, ["web"])
      assert.deepEqual(schedule.sessions[0].broadcast, ["youtube", "live"])
      assert.equal(schedule.speakers[0].avatar, "https://example.com/speakers/alice.png")
    }
  )
})

test("generateScheduleObject reads public edit page sheet metadata", async () => {
  await withMockSheets(
    {
      0: "title_zh,description_zh,title_en,description_en,speaker1id,tag1\nnote,note,note,note,note,note\n",
      1: "avatar,name_zh,bio_zh,name_en,bio_en\nnote,note,note,note,note\n",
      2: "name_zh,description_zh,name_en,description_en\n議程,說明,Session,Description\n",
      3: "name_zh,description_zh,name_en,description_en\n大廳,說明,Hall,Description\n",
      4: "name_zh,description_zh,name_en,description_en\nWeb,說明,Web,Description\n",
    },
    async () => {
      const schedule = await generateScheduleObject({
        spreadsheetKey: "public-sheet",
        default_avatar: "https://example.com/default.png",
        avatar_base_url: "https://example.com/speakers/",
      })

      assert.deepEqual(Object.keys(schedule), ["sessions", "speakers", "session_types", "rooms", "tags"])
    },
    EDIT_PAGE_METADATA
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

test("generateScheduleObject reports the sheet and missing required columns", async () => {
  await withMockSheets(
    {
      0: "title_zh\nnote\n",
      1: "avatar,name_zh,bio_zh,name_en,bio_en\nnote,note,note,note,note\n",
      2: "name_zh,description_zh,name_en,description_en\n議程,說明,Session,Description\n",
      3: "name_zh,description_zh,name_en,description_en\n大廳,說明,Hall,Description\n",
      4: "name_zh,description_zh,name_en,description_en\nWeb,說明,Web,Description\n",
    },
    async () => {
      await assert.rejects(
        () =>
          generateScheduleObject({
            spreadsheetKey: "public-sheet",
            default_avatar: "https://example.com/default.png",
            avatar_base_url: "https://example.com/speakers/",
          }),
        /Session sheet is missing required column\(s\): description_zh/
      )
    }
  )
})

test("generateScheduleObject requires Session and Speaker note rows", async () => {
  await withMockSheets(
    {
      0: "title_zh,description_zh,title_en,description_en,speaker1id,tag1\n",
      1: "avatar,name_zh,bio_zh,name_en,bio_en\nnote,note,note,note,note\n",
      2: "name_zh,description_zh,name_en,description_en\n議程,說明,Session,Description\n",
      3: "name_zh,description_zh,name_en,description_en\n大廳,說明,Hall,Description\n",
      4: "name_zh,description_zh,name_en,description_en\nWeb,說明,Web,Description\n",
    },
    async () => {
      await assert.rejects(
        () =>
          generateScheduleObject({
            spreadsheetKey: "public-sheet",
            default_avatar: "https://example.com/default.png",
            avatar_base_url: "https://example.com/speakers/",
          }),
        /Session sheet must include the first human-readable note row/
      )
    }
  )
})

test("generateScheduleObject reports invalid config before fetching", async () => {
  await assert.rejects(
    () => generateScheduleObject({ spreadsheetKey: "", default_avatar: "", avatar_base_url: "" }),
    /Config field spreadsheetKey must be a non-empty string/
  )
})

test("generateScheduleObject reports missing spreadsheet separately from sharing errors", async () => {
  await withMockFetch(
    async () => ({ ok: false, status: 404 }),
    async () => {
      await assert.rejects(
        () =>
          generateScheduleObject({
            spreadsheetKey: "missing-sheet",
            default_avatar: "https://example.com/default.png",
            avatar_base_url: "https://example.com/speakers/",
          }),
        /Spreadsheet not found\. Check config\.spreadsheetKey\./
      )
    }
  )
})

test("generateScheduleObject reports private metadata pages as sharing errors", async () => {
  const responses = [
    { ok: true, text: async () => "<!doctype html><html><title>Sign in</title></html>" },
    { ok: false, status: 404 },
  ]

  await withMockFetch(
    async () => responses.shift(),
    async () => {
      await assert.rejects(
        () =>
          generateScheduleObject({
            spreadsheetKey: "private-sheet",
            default_avatar: "https://example.com/default.png",
            avatar_base_url: "https://example.com/speakers/",
          }),
        /Failed to find sheet metadata\. Share the spreadsheet publicly or publish it to the web\./
      )
    }
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
          generateScheduleObject({
            spreadsheetKey: "private-sheet",
            default_avatar: "https://example.com/default.png",
            avatar_base_url: "https://example.com/speakers/",
          }),
        /Failed to fetch .* as CSV/
      )
    }
  )
})
