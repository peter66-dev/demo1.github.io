/***********************
 * CONFIG
 ***********************/
const CFG = {
  SPREADSHEET_ID: '1RTADUVmkyB6d1bhRc9A9AaZ7Ju5E9hBblR_vtbEhzzo',
  LOG_SHEET_NAME: 'EmailLogs',
  TEST_EMAIL: 'vanphuong.dev@gmail.com',
  COMPANY_EMAIL: 'vaisoiphuongnguyen@gmail.com',
};

/***********************
 * Helpers
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
    'client_key',
    'created_at',
    'browser_type',
    'params',
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

function doPost(e) {
  const startedAt = new Date();
  let payload = {};
  let status = 'FAILED';
  let errorMessage = '';
  try {
    payload = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');

    const subject = payload.subject || `[PN Fabrics] Thông báo từ khách hàng`;
    const htmlBody = payload.html || '<p>No content</p>';
    const id = payload.id || '';

    // 1) Send email
    // GmailApp.sendEmail(CFG.TEST_EMAIL, subject, 'HTML only', { htmlBody });

    status = 'SUCCESS';

    // 2) Log to Sheet (SUCCESS)
    logToSheet_({
      id: id,
      client_key: payload.client_key || '',
      created_at: startedAt,
      browser_type: payload.browser_type || '',
      params: {
        full_name: payload.full_name || '',
        phone: payload.phone || '',
        email: payload.email || '',
        product_name: payload.product_name || '',
        quantity: payload.quantity || '',
        note: payload.note || '',
        subject,
      },
      status,
      error_message: '',
    });

    return ContentService.createTextOutput(
      JSON.stringify({
        status_code: 200,
        message: 'SUCCESS',
        error_message: '',
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    errorMessage = 'ERROR: ' + (err && err.message ? err.message : String(err));

    // Log to Sheet (FAILED)
    try {
      logToSheet_({
        id: id,
        client_key: payload.client_key || '',
        created_at: startedAt,
        browser_type: payload.browser_type || '',
        params: {
          full_name: payload.full_name || '',
          phone: payload.phone || '',
          email: payload.email || '',
          product_name: payload.product_name || '',
          quantity: payload.quantity || '',
          note: payload.note || '',
          subject: payload.subject || '',
        },
        status: 'FAILED',
        error_message: errorMessage,
      });
    } catch (logErr) {
      return ContentService.createTextOutput(
        JSON.stringify({
          status_code: 500,
          message: 'FAILED',
          error_message: 'ERROR: ' + err,
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status_code: 500,
        message: 'FAILED',
        error_message: 'ERROR: ' + err,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
