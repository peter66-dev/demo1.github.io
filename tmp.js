/***********************
 * CONFIG
 ***********************/
const CFG = {
  SPREADSHEET_ID: '1RTADUVmkyB6d1bhRc9A9AaZ7Ju5E9hBblR_vtbEhzzo',
  LOG_SHEET_NAME: 'EmailLogs',
  TEST_EMAIL: 'vanphuong.dev@gmail.com',
  COMPANY_EMAIL: 'vaisoiphuongnguyen@gmail.com',

  // Timezone dùng để tính "hôm nay"
  TZ: 'Asia/Ho_Chi_Minh',
};

/***********************
 * Response helpers
 ***********************/
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function logToSheet_(row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const sh = ss.getSheetByName(CFG.LOG_SHEET_NAME) || ss.insertSheet(CFG.LOG_SHEET_NAME);

    ensureHeader_(sh);

    sh.appendRow([
      row.id,
      row.client_key,
      row.created_at,
      row.browser_type,
      row.params,
      row.status,
      row.error_message,
    ]);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status_code: 500,
        message: 'FAILED',
        error_message: 'ERROR: ' + err,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function ensureHeader_(sh) {
  const headers = [
    'id',
    'public_ip',
    'created_at',
    'browser_type',
    'params_json',
    'status',
    'error_message',
  ];

  const firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  const isEmpty = firstRow.every(v => !v);

  if (isEmpty) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
}

function appendLog_(logRow) {
  // Single responsibility: append 1 row
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getLogSheet_();
    sh.appendRow([
      logRow.id || '',
      logRow.public_ip || '',
      logRow.created_at || '',
      logRow.browser_type || '',
      logRow.params_json || '',
      logRow.status || 'FAILED',
      logRow.error_message || '',
    ]);
  } finally {
    lock.releaseLock();
  }
}

/***********************
 * API: sendEmail
 * POST /exec?action=sendEmail
 ***********************/
function apiSendEmail_(e) {
  const startedAt = new Date();
  const createdAt = dateKey_(startedAt);

  let payload = {};
  let id = '';
  let publicIp = '';
  let subject = '';
  let htmlBody = '';
  let browserType = '';

  try {
    payload = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');

    id = payload.id || '';
    subject = payload.subject || `[PN Fabrics] Thông báo từ khách hàng`;
    htmlBody = payload.html || '<p>No content</p>';
    browserType = payload.browser_type || '';

    // Ưu tiên: IP do frontend gửi (public_ip)
    // Nếu muốn lấy từ header backend (best-effort): fallback getPublicIpFromHeaders_
    publicIp = (payload.public_ip || '').trim() || getPublicIpFromHeaders_(e);

    if (!publicIp) return bad_(400, 'Missing public_ip (and cannot detect from headers)');

    // ✅ SEND EMAIL (bật lại khi cần)
    // GmailApp.sendEmail(CFG.COMPANY_EMAIL, subject, 'HTML only', { htmlBody });

    // Log SUCCESS
    appendLog_({
      id,
      public_ip: publicIp,
      created_at: createdAt,
      browser_type: browserType,
      params_json: JSON.stringify({
        full_name: payload.full_name || '',
        phone: payload.phone || '',
        email: payload.email || '',
        product_name: payload.product_name || '',
        quantity: payload.quantity || '',
        note: payload.note || '',
        subject,
      }),
      status: 'SUCCESS',
      error_message: '',
    });

    return ok_({ id, public_ip: publicIp });
  } catch (err) {
    const errorMessage = 'ERROR: ' + (err && err.message ? err.message : String(err));

    // Log FAILED (best-effort)
    try {
      publicIp = publicIp || (payload.public_ip || '').trim() || getPublicIpFromHeaders_(e);
      appendLog_({
        id: id || payload.id || '',
        public_ip: publicIp || '',
        created_at: createdAt,
        browser_type: browserType || payload.browser_type || '',
        params_json: JSON.stringify({
          full_name: payload.full_name || '',
          phone: payload.phone || '',
          email: payload.email || '',
          product_name: payload.product_name || '',
          quantity: payload.quantity || '',
          note: payload.note || '',
          subject: payload.subject || '',
        }),
        status: 'FAILED',
        error_message: errorMessage,
      });
    } catch (_) {}

    return bad_(500, errorMessage);
  }
}

/***********************
 * API: getRecords
 * GET /exec?action=getRecords&public_ip=1.2.3.4&day=yyyy-MM-dd
 *
 * - day optional: default = today
 * - public_ip required
 ***********************/
function apiGetRecords_(e) {
  const p = e && e.parameter ? e.parameter : {};
  const publicIp = (p.public_ip || '').trim();
  const day = (p.day || '').trim() || todayKey_(); // yyyy-MM-dd

  if (!publicIp) return bad_(400, 'Missing public_ip');

  const sh = getLogSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return ok_({ day, public_ip: publicIp, records: [] });

  // Header: 7 columns
  const values = sh.getRange(2, 1, lastRow - 1, 7).getValues();

  const records = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowObj = {
      id: row[0],
      public_ip: row[1],
      created_at: row[2],
      // browser_type: row[3],
      // params: safeJsonParse_(row[4]),
      status: row[5],
      // error_message: row[6],
    };

    if (rowObj.public_ip === publicIp && rowObj.created_at === day && rowObj.status === 'SUCCESS') {
      records.push(rowObj);
    }
  }

  return ok_({ day, public_ip: publicIp, total: records.length, records });
}

function safeJsonParse_(s) {
  try {
    if (!s) return null;
    return JSON.parse(String(s));
  } catch (_) {
    return String(s);
  }
}

/***********************
 * Router
 ***********************/
function doGet(e) {
  const action = e && e.parameter && e.parameter.action ? String(e.parameter.action) : '';
  if (action === 'getRecords') return apiGetRecords_(e);
  return bad_(404, 'Unknown action');
}

function doPost(e) {
  const action = e && e.parameter && e.parameter.action ? String(e.parameter.action) : '';
  if (action === 'sendEmail') return apiSendEmail_(e);
  return bad_(404, 'Unknown action');
}
