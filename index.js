#!/usr/bin/env node

const path = require("node:path")
const generateSchedule = require("./generateSchedule")

function printHelp() {
  console.log(`Usage: schedule-json-generator [config.js]

Generate OPass schedule JSON from a public Google Spreadsheet.

Arguments:
  config.js  Path to a CommonJS config file. Defaults to ./config.js.
`)
}

async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp()
    return
  }

  const configPath = path.resolve(argv[0] || "config.js")
  const config = require(configPath)
  process.stdout.write(await generateSchedule(config))
  process.stdout.write("\n")
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = { main }
