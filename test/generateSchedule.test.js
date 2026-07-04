const assert = require("node:assert/strict")
const test = require("node:test")
const generateSchedule = require("../generateSchedule")

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
