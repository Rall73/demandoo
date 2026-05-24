import nodemailer from "nodemailer"

const FROM    = process.env.EMAIL_FROM    ?? "demandoo <noreply@demandoo.net>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://demandoo.net"

/** Cria um transporter fresco a cada envio, garantindo uso das env vars atuais. */
function makeTransporter() {
  const port   = Number(process.env.SMTP_PORT ?? 587)
  const secure = port === 465 // SSL para 465, STARTTLS para 587
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.hostinger.com",
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })
}

/** Envia e-mail de verificação de conta. */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/verificar?token=${token}`
  await makeTransporter().sendMail({
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

/** Envia e-mail para contas Google criarem senha pela 1ª vez. */
export async function sendDefinePasswordEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/nova-senha?token=${token}`
  await makeTransporter().sendMail({
    from:    FROM,
    to:      email,
    subject: "Crie sua senha — demandoo",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7c3aed">Criar senha no demandoo</h2>
        <p>Sua conta foi criada com o Google. Você pode criar uma senha para também entrar com e-mail e senha:</p>
        <a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Criar minha senha
        </a>
        <p style="color:#64748b;font-size:13px">
          O link expira em 1 hora.<br>
          Se você não solicitou isso, ignore este e-mail. Seu login com Google continua funcionando normalmente.
        </p>
      </div>
    `,
  })
}

/** Envia e-mail de confirmação de troca de endereço. */
export async function sendEmailChangeEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/confirmar-email?token=${token}`
  await makeTransporter().sendMail({
    from:    FROM,
    to:      email,
    subject: "Confirme seu novo e-mail — demandoo",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7c3aed">Confirmar novo e-mail</h2>
        <p>Recebemos um pedido para trocar o e-mail da sua conta demandoo. Clique no botão abaixo para confirmar que este é o seu novo endereço:</p>
        <a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Confirmar novo e-mail
        </a>
        <p style="color:#64748b;font-size:13px">
          O link expira em 24 horas.<br>
          Se você não solicitou isso, ignore este e-mail. Seu e-mail atual continua funcionando normalmente.
        </p>
      </div>
    `,
  })
}

/** Envia convite para entrar na empresa. */
export async function sendInviteEmail(
  email: string,
  token: string,
  companyName: string,
  inviterName: string
): Promise<void> {
  const url = `${APP_URL}/auth/convite?token=${token}`
  await makeTransporter().sendMail({
    from:    FROM,
    to:      email,
    subject: `${inviterName} te convidou para o demandoo`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7c3aed">Você foi convidado!</h2>
        <p><strong>${inviterName}</strong> te convidou para entrar na equipe <strong>${companyName}</strong> no demandoo.</p>
        <a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Aceitar convite
        </a>
        <p style="color:#64748b;font-size:13px">
          O link expira em 7 dias.<br>
          Se você não esperava este convite, pode ignorar este e-mail.
        </p>
      </div>
    `,
  })
}

/** Envia lembrete de prazo (D-1 ou D-0). */
export async function sendLembreteEmail(
  email:     string,
  userName:  string,
  titulo:    string,
  demandaId: number,
  tipo:      "D-1" | "D-0"
): Promise<void> {
  const url     = `${APP_URL}/app/${demandaId}`
  const isHoje  = tipo === "D-0"
  const subject = isHoje
    ? `🔴 Prazo hoje: ${titulo}`
    : `🟡 Prazo amanhã: ${titulo}`
  const mensagem = isHoje
    ? "O prazo desta demanda <strong>vence hoje</strong>."
    : "O prazo desta demanda <strong>vence amanhã</strong>."

  await makeTransporter().sendMail({
    from:    FROM,
    to:      email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7c3aed">Lembrete de prazo</h2>
        <p>Olá, ${userName}!</p>
        <p>${mensagem}</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;font-weight:600;color:#1e293b">${titulo}</p>
        </div>
        <a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">
          Ver demanda
        </a>
        <p style="color:#64748b;font-size:13px;margin-top:16px">
          Você está recebendo este e-mail porque tem uma demanda com prazo próximo no demandoo.
        </p>
      </div>
    `,
  })
}

/** Envia e-mail de reset de senha. */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/nova-senha?token=${token}`
  await makeTransporter().sendMail({
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
