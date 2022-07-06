const generateSchedule = require('./generateSchedule')
const config = require("./config");
(async () => {
  let res = await generateSchedule(config)
  console.log(res)
})()
