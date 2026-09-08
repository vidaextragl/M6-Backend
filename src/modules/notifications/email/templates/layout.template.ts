export function wrapEmailLayout(title: string, rows: Array<[string, string]>): string {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px;color:#555555;">${label}</td><td style="padding:4px 12px;font-weight:bold;">${value}</td></tr>`,
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px;">
      <h2 style="color:#1a1a1a;">${title}</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${rowsHtml}</table>
      <p style="margin-top:24px;color:#999999;font-size:12px;">Vida Extra · Tu billetera gamer</p>
    </div>
  `;
}
