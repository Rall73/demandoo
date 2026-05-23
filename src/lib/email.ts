import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = process.env.EMAIL_FROM ?? "demandoo <noreply@demandoo.net>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://demandoo.net"

/** Envia e-mail de verificação de conta. */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/verificar?token=${token}`
  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: "Confirme seu e-mail — demandoo",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7c3aed">Bem-vindo ao demandoo!</h2>
        <p>Clique no botão abaixo para confirmar seu e-mail e ativar sua conta:</p>
        <a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Confirmar e-mail
        </a>
        <p style="color:#64748b;font-size:13px">
          O link expira em 24 horas.<br>
          Se você não criou uma conta, ignore este e-mail.
        </p>
      </div>
    `,
  })
}

/** Envia e-mail de reset de senha. */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/nova-senha?token=${token}`
  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: "Redefinição de senha — demandoo",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7c3aed">Redefinir senha</h2>
        <p>Recebemos um pedido para redefinir a senha da conta associada a este e-mail.</p>
        <a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Redefinir senha
        </a>
        <p style="color:#64748b;font-size:13px">
          O link expira em 1 hora.<br>
          Se você não solicitou isso, ignore este e-mail.
        </p>
      </div>
    `,
  })
}
