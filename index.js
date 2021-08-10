const config = require("./config");
const fetch = require('node-fetch');
const fetchSettings = { method: "GET" };

function nullCoalesce(value) {
  return value == null ? "" : value;
}

const getSpreadsheetJSONEndpoint = (spreadSheetId, sheetId) => `https://spreadsheets.google.com/feeds/list/${spreadSheetId}/${sheetId}/public/values?alt=json`;

const opassSessionUrl = getSpreadsheetJSONEndpoint(config.spreadsheetKey, 1);
const opassSpeakerUrl = getSpreadsheetJSONEndpoint(config.spreadsheetKey, 2);
const opassSessionTypeUrl = getSpreadsheetJSONEndpoint(config.spreadsheetKey, 3);
const opassRoomUrl = getSpreadsheetJSONEndpoint(config.spreadsheetKey, 4);
const opassTagUrl = getSpreadsheetJSONEndpoint(config.spreadsheetKey, 5);

let data = {
  sessions: {},
  speakers: {},
  session_types: {},
  rooms: {},
  tags: {},
};

const fetchError = (e) => console.error(e)

const sessionFetch = () => fetch(opassSessionUrl, fetchSettings)
  .then(res => res.json())
  .then(json => {
    s = json.feed.entry;
    s.shift()
    data.sessions = s.map(e => {
      return {
        id: e['gsx$id']['$t'],
        zh: {
          title: nullCoalesce(e['gsx$titlezh']['$t']),
          description: nullCoalesce(e['gsx$descriptionzh']['$t']),
        },
        en: {
          title: nullCoalesce(e['gsx$titleen']['$t']),
          description: nullCoalesce(e['gsx$descriptionen']['$t']),
        },
        speakers: [...Array(9).keys()].slice(1).map(sp => (e[`gsx$speaker${sp}id`] || {'$t':''})['$t']).filter(f => f),
        broadcast: e['gsx$broadcast']['$t'].split(',').filter(f => f),
        tags: [...Array(4).keys()].slice(1).map(sp => (e[`gsx$tag${sp}`] || {'$t':''})['$t']).filter(f => f),
        type: e['gsx$type']['$t'],
        room: e['gsx$room']['$t'],
        start: e['gsx$start']['$t'],
        end: e['gsx$end']['$t'],
        qa: e['gsx$qa']['$t'],
        slide: e['gsx$slide']['$t'],
        co_write: e['gsx$cowrite']['$t'],
        live: e['gsx$live']['$t'],
        record: e['gsx$record']['$t'],
        language: e['gsx$language']['$t'],
      };
    });
  });
const speakerFetch = () => fetch(opassSpeakerUrl, fetchSettings)
  .then(res => res.json())
  .then(json => {
    s = json.feed.entry;
    s.shift()
    data.speakers = s.map(e => {
      let avatar = e['gsx$avatar']['$t'];
      return {
        id: e['gsx$id']['$t'],
        avatar: avatar.length == 0 ? config.default_avatar : config.avatar_base_url + avatar,
        zh: {
          name: nullCoalesce(e['gsx$namezh']['$t']),
          bio: nullCoalesce(e['gsx$biozh']['$t']),
        },
        en: {
          name: nullCoalesce(e['gsx$nameen']['$t']),
          bio: nullCoalesce(e['gsx$bioen']['$t']),
        },
      };
    });
  });
const sessionTypeFetch = () => fetch(opassSessionTypeUrl, fetchSettings)
  .then(res => res.json())
  .then(json => {
    data.session_types = json.feed.entry.map(e => {
      return {
        id: e['gsx$id']['$t'],
        zh: {
          name: nullCoalesce(e['gsx$namezh']['$t']),
          description: nullCoalesce(e['gsx$descriptionzh']['$t']),
        },
        en: {
          name: nullCoalesce(e['gsx$nameen']['$t']),
          description: nullCoalesce(e['gsx$descriptionen']['$t']),
        },
      };
    });
  });
const roomFetch = () => fetch(opassRoomUrl, fetchSettings)
  .then(res => res.json())
  .then(json => {
    data.rooms = json.feed.entry.map(e => {
      return {
        id: e['gsx$id']['$t'],
        zh: {
          name: nullCoalesce(e['gsx$namezh']['$t']),
          description: nullCoalesce(e['gsx$descriptionzh']['$t']),
        },
        en: {
          name: nullCoalesce(e['gsx$nameen']['$t']),
          description: nullCoalesce(e['gsx$descriptionen']['$t']),
        },
      };
    });
  });
const tagFetch = () => fetch(opassTagUrl, fetchSettings)
  .then(res => res.json())
  .then(json => {
    data.tags = json.feed.entry.map(e => {
      return {
        id: e['gsx$id']['$t'],
        zh: {
          name: nullCoalesce(e['gsx$namezh']['$t']),
          description: nullCoalesce(e['gsx$descriptionzh']['$t']),
        },
        en: {
          name: nullCoalesce(e['gsx$nameen']['$t']),
          description: nullCoalesce(e['gsx$descriptionen']['$t']),
        },
      };
    });
  });

const fetches = [ sessionFetch, speakerFetch, sessionTypeFetch, roomFetch, tagFetch ];
let fetcheAll = fetches.map(f => f());

const doAll = () => Promise.allSettled(fetcheAll)
  .then(results => {
    fetcheAll = []
    for (const [index, result] of results.entries()) {
      // console.log(index, result.status)
      if (result.status == 'rejected') {
        fetcheAll.push(fetches[index]())
      }
    }
    if (fetcheAll.length > 0) {
      doAll();
    } else {
      console.log(JSON.stringify(data))
    }
  })
doAll()
