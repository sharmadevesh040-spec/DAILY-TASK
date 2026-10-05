import nodemailer, { Transporter } from 'nodemailer';

// ── SMTP environment validation ──────────────────────────────────────────────
const REQUIRED_SMTP_VARS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
] as const;

export function validateSmtpConfig(): void {
  const missing = REQUIRED_SMTP_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(
      `[EmailService] ❌ Missing SMTP environment variables: ${missing.join(', ')}\n` +
        '  Add them to server/.env — see .env.example for format.'
    );
    // Don't crash the whole server; OTP routes will return a clear error at
    // request time if the transporter is not configured.
  } else {
    console.log('[EmailService] ✅ SMTP configuration loaded');
  }
}

// ── Transporter (lazy singleton) ─────────────────────────────────────────────
let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,          // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,  // allow self-signed certs in dev
    },
  });

  return _transporter;
}

// ── HTML email template ───────────────────────────────────────────────────────
function buildOtpEmail(otp: string, purpose: string): { subject: string; html: string; text: string } {
  const purposeLabel =
    purpose === 'REGISTER'       ? 'verify your new account'
    : purpose === 'PASSWORD_RESET' ? 'reset your password'
    : 'sign in to your account';

  const subject = 'Your Daily Task Manager Verification Code';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#4f46e5;border-radius:12px;padding:10px 14px;">
                    <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">⚡ TaskFlow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:40px 36px;">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;text-align:center;">
                Verification Code
              </h1>
              <p style="margin:0 0 32px;font-size:15px;color:#64748b;text-align:center;line-height:1.5;">
                Use the code below to ${purposeLabel}.
              </p>

              <!-- OTP box -->
              <div style="background:#f1f5f9;border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:32px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Your one-time code</p>
                <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:14px;color:#4f46e5;font-variant-numeric:tabular-nums;">${otp}</p>
              </div>

              <!-- Expiry notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#fef3c7;border-radius:8px;padding:12px 16px;border-left:3px solid #f59e0b;">
                    <p style="margin:0;font-size:13px;color:#92400e;">
                      ⏱️ <strong>This code expires in 5 minutes.</strong>
                      Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- If not you -->
              <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
                If you did not request this code, you can safely ignore this email.
                Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Daily Task Manager &nbsp;·&nbsp; This is an automated email, please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Daily Task Manager — Verification Code\n\nYour one-time code: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.\n\nIf you did not request this, ignore this email.`;

  return { subject, html, text };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function sendOtpEmail(toEmail: string, otp: string, purpose: string): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP credentials are not configured. Set SMTP_USER and SMTP_PASSWORD in server/.env');
  }

  const transporter = getTransporter();
  const { subject, html, text } = buildOtpEmail(otp, purpose);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Daily Task Manager" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject,
    html,
    text,
  });
}

export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}
