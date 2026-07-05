import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { main } from "../index.js"

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

test("CLI loads config.js as an ES module", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-json-generator-"))
  fs.writeFileSync(path.join(tmp, "package.json"), '{"type":"module"}\n')
  fs.writeFileSync(path.join(tmp, "config.js"), "export default {}\n")
  const originalCwd = process.cwd()

  process.chdir(tmp)

  try {
    await assert.rejects(() => main([]), /Config field spreadsheetKey must be a non-empty string/)
  } finally {
    process.chdir(originalCwd)
  }
})
