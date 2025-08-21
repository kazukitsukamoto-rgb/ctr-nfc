/* global SpreadsheetApp, ContentService, PropertiesService */

//=== Configuration ===
const SHEET_NAME   = 'ChoiceToRun_NFC';
const TABS         = ['Serious_Individual','Serious_Team','Fun_Individual','Fun_Team','Results'];
const PROP_SHEET_ID = 'SHEET_ID';
const PROP_INIT     = 'INIT_DONE';

/** GET handler */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok:true, service:'ChoiceToRun_NFC' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** create sheet if not exists + tab/headers init (one-time) */
function _getOrCreateSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const id    = props.getProperty(PROP_SHEET_ID);
  let  ss     = null;

  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch(e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty(PROP_SHEET_ID, ss.getId());
  }

  if (props.getProperty(PROP_INIT) !== '1') {
    const have = ss.getSheets().map(s => s.getName());
    TABS.forEach(tab => {
      if (!have.includes(tab)) {
        ss.insertSheet(tab);
      }
      const sh = ss.getSheetByName(tab);
      const header = (tab === 'Results')
        ? ['serverTime','clientTime','name','course','category','teamName','totalLaps']
        : ['serverTime','clientTime','name','course','category','teamName','lap','tagId'];
      if (sh.getLastRow() === 0) {
        sh.appendRow(header);
      }
    });

    const defaultSh = ss.getSheetByName('Sheet1');
    if (defaultSh && defaultSh.getLastRow() === 0) {
      ss.deleteSheet(defaultSh);
    }

    props.setProperty(PROP_INIT,'1');
  }

  return ss;
}

/** POST handler (lap / final) */
function doPost(e) {
  const serverTime = new Date().toISOString();

  // The client sends URL-encoded form data (no JSON)
  const body = (e && e.parameter) ? e.parameter : {};

  const ss = _getOrCreateSpreadsheet();

  try {
    if (body.type === 'lap') {
      const tab = _tabFor(body.course, body.category);
      ss.getSheetByName(tab).appendRow([
        serverTime,
        body.clientTime || '',
        body.name       || '',
        body.course     || '',
        body.category   || '',
        body.teamName   || '',
        body.lap        || '',
        body.tagId      || ''
      ]);
      return _resp({ ok:true, serverTime });
    }

    if (body.type === 'final') {
      ss.getSheetByName('Results').appendRow([
        serverTime,
        body.clientTime || '',
        body.name       || '',
        body.course     || '',
        body.category   || '',
        body.teamName   || '',
        body.totalLaps  || 0
      ]);
      return _resp({ ok:true, serverTime });
    }

    return _resp({ ok:true, note:'ignored (unknown type)' });
  }
  catch(err) {
    return _resp({ ok:false, error:String(err) });
  }
}

function _tabFor(course, category) {
  const c = (String(course)   === 'serious') ? 'Serious' : 'Fun';
  const k = (String(category) === 'team')    ? 'Team'    : 'Individual';
  return `${c}_${k}`;
}

function _resp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
} 