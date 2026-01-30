function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const subject = data.subject || `[PN Fabrics] Thông báo từ khách hàng`;
    const htmlBody = data.html || '<p>No content</p>';
    const companyEmail = 'vaisoiphuongnguyen@gmail.com';
    const testEmail = 'vanphuong.dev@gmail.com';

    // sendEmail(recipient, subject, body, options);
    GmailApp.sendEmail(testEmail, subject, 'HTML only', { htmlBody });

    return ContentService.createTextOutput(
      JSON.stringify({
        status_code: 200,
        message: 'SUCCESS',
        error_message: '',
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
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
    - Add images for custom products
    - Emails-Qx-2026: history table
    - Idempotent
        - READ validation: idempotent (client-id & day > 3 times)
        - WRITE: idempotent & history
    - Rate limit: avoid user spam email form
        - idempotent: check 3 times (client-id & day)
            - Yes: send email + idempotent record
            - No: handle error alert -> noti user exceed email sending today! 
 */
