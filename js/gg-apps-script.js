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
      row.public_ip,
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
  let errorMessage = '';
  try {
    payload = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');

    const subject = payload.subject || `[PN Fabrics] Thông báo từ khách hàng`;
    const htmlBody = payload.html || '<p>No content</p>';
    const id = payload.id || '';

    const publicIp = payload.public_ip || '';
    if (!publicIp) {
      return json_({ status_code: 400, message: 'FAILED', error_message: 'Missing public_ip' });
    }

    // 1) Send email
    // GmailApp.sendEmail(CFG.TEST_EMAIL, subject, 'HTML only', { htmlBody });

    // 2) Log to Sheet (SUCCESS)
    logToSheet_({
      id: id,
      public_ip: publicIp || '',
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
      status: 'SUCCESS',
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
        public_ip: publicIp || '',
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

/**
    - Add images for custom products                                                [DONE]
    - Update product information of custom products                                 [NOT STARTED]
    - Emails-Qx-2026: history table                                                 [NOT STARTED] 
    - Idempotent                                                                    [NOT STARTED]
        - READ validation: idempotent (public-id & day > 5 times)                   [NOT STARTED]
        - WRITE: idempotent & history record                                        [NOT STARTED]                
    - Rate limit: avoid user spam email form                                        [NOT STARTED]          
        - idempotent: check 5 times (public-id & day)                               [NOT STARTED]
            - Yes: send email + history records                                     [NOT STARTED]
            - No: handle error alert -> noti user exceed email sending today!       [NOT STARTED]


    - Ratelimit on local                                                            [DONE] 
    - Get IPAddress from header of request (replace client_key)                     [DONE]
    - Show 2 items on mobile view                                                   [NOT STARTED] 
    - Fix bug: Can not getLogs from gg script                                       [NOT STARTED] 
    - Show 2 items on mobile view                                                   [NOT STARTED] 
 */
