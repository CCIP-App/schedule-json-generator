const assert = require("node:assert/strict")
const test = require("node:test")
const { main } = require("../index")

test("CLI prints help without loading a config file", async () => {
  const output = []
  const originalLog = console.log
  console.log = (message) => output.push(message)

  try {
    await main(["--help"])
  } finally {
    console.log = originalLog
  }

  assert.match(output.join("\n"), /Usage: schedule-json-generator \[config\.js\]/)
})
