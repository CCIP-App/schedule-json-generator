#!/usr/bin/env node

import { pathToFileURL } from "node:url"
import { generateScheduleObject } from "./generateSchedule.js"

function printHelp() {
  console.log(`Usage: schedule-json-generator [config.js]

Generate OPass schedule JSON from a public Google Spreadsheet.

Arguments:
  config.js  Path to an ES module config file. Defaults to ./config.js.
`)
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp()
    return
  }

  const config = (await import(pathToFileURL(argv[0] || "config.js").href)).default
  process.stdout.write(JSON.stringify(await generateScheduleObject(config)))
  process.stdout.write("\n")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
