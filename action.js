const core = require('@actions/core');
const generateSchedule = require('./generateSchedule')
try {
  const config = {
    gcp_api_key: core.getInput('gcp-api-key'),
    spreadsheetKey: core.getInput('spreadsheet-key'),
    default_avatar: core.getInput('default-avatar'),
    avatar_base_url: core.getInput('avatar-base-url')
  };
  (async () => {
    let res = await generateSchedule(config);
    core.setOutput("output-json", res);
    console.log(`Generate schedule successfully!`);
  })()
} catch (error) {
  core.setFailed(error.message);
}