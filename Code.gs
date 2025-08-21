/* global SpreadsheetApp, ContentService */

/**
 * Sheets layout (auto-created on first run):
 *  - Serious_Individual
 *  - Serious_Team
 *  - Fun_Individual
 *  - Fun_Team
 *  - Results
 */
const SHEET_NAME = 'ChoiceToRun_NFC';
const TABS = ['Serious_Individual','Serious_Team','Fun_Individual','Fun_Team','Results'];

function _getOrCreateSpreadsheet() {
  let ss;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty('SHEET_ID', ss.getId());
  }
  // ensure tabs
  const have = ss.getSheets().map(s => s.getName());
  TABS.forEach(tab => {
    if (!have.includes(tab)) {
      ss.insertSheet(tab);
      const sh = ss.getSheetByName(tab);
      if (tab === 'Results') {
        sh.appendRow(['serverTime','clientTime','name','course','category','teamName','totalLaps']);
      } else {
        sh.appendRow(['serverTime','clientTime','name','course','category','teamName','lap','tagId']);
      }
    }
  });
  return ss;
}

function doPost(e) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  
  const serverTime = new Date().toISOString();
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok:false, error:'Bad JSON' }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
  }

  const ss = _getOrCreateSpreadsheet();

  if (body.type === 'lap') {
    const tab = _tabFor(body.course, body.category);
    const sh = ss.getSheetByName(tab);
    sh.appendRow([
      serverTime,
      body.clientTime || '',
      body.name || '',
      body.course || '',
      body.category || '',
      body.teamName || '',
      body.lap || '',
      body.tagId || ''
    ]);
    return _ok({ serverTime });
  }

  if (body.type === 'final') {
    const sh = ss.getSheetByName('Results');
    sh.appendRow([
      serverTime,
      body.clientTime || '',
      body.name || '',
      body.course || '',
      body.category || '',
      body.teamName || '',
      body.totalLaps || 0
    ]);
    return _ok({ serverTime });
  }

  return _ok({ note:'unknown type ignored' });
}

function _tabFor(course, category) {
  const c = (course === 'serious') ? 'Serious' : 'Fun';
  const k = (category === 'team') ? 'Team' : 'Individual';
  return `${c}_${k}`;
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
}

function _ok(obj) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({ ok:true }, obj)))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
} 