export function buildEmailPayload({ fullName, phone, quantity, productName, note }) {
  const subject = `[PN Fabrics] Thông báo từ khách hàng – ${productName || 'Sản phẩm'}`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color:#111;">
      <div style="margin:0 0 10px; padding:10px 12px; background:#fffbe6; border-left:4px solid #d9c210;">
        <div style="font-size:15px;">
          Yêu cầu mới từ website <span style="color:#b58f00;">phuongnguyenfabrics.com</span>
        </div>
        <div style="color:#666; font-size:13px; margin-top:4px;">
          Thông báo tự động từ hệ thống
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:14px 0" />

      <div style="margin-top:10px;">
        <div style="margin-bottom:6px;">Khách hàng</div>
        <div>- Họ và tên: <b>${escapeHtml(fullName)}</b></div>
        <div>- Điện thoại / Zalo: <b>${escapeHtml(phone)}</b></div>
        <div>- Email: <b>${escapeHtml(phone)}</b></div>
      </div>

      <div style="margin-top:12px;">
        <div style="margin-bottom:6px;">Sản phẩm quan tâm: </div>
        <div>- Tên sản phẩm: <b>${escapeHtml(productName || '')}</b></div>
        <div>- Số lượng dự kiến: <b>${escapeHtml(quantity)}</b></div>
      </div>

      ${
        note
          ? `
        <div style="margin-top:12px;">
          <div style="margin-bottom:6px;">Ghi chú từ khách hàng: </div>
          <div style="padding:10px; background:#fafafa; border-left:4px solid #d9c210;">
            ${escapeHtml(note)}
          </div>
        </div>`
          : 'Không có ghi chú.'
      }

      <hr style="border:none;border-top:1px solid #eee;margin:14px 0" />

      <div style="color:#555; font-size:13px;">
        Thời gian gửi: ${new Date().toLocaleString('vi-VN')}
      </div>

      <div style="margin-top:10px;">
        <b>Hành động đề xuất:</b> Vui lòng liên hệ khách hàng sớm để tư vấn, gửi mẫu và báo giá.
      </div>

      <div style="margin-top:14px; color:#777; font-size:13px;">
        —<br/>PN Fabrics Website
      </div>
    </div>
  `;

  return { subject, html };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
