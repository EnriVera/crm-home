import { render } from "@octanejs/email";
import OtpEmail from "./templates/otp-email.tsrx";

export { default as OtpEmail } from "./templates/otp-email.tsrx";

export const OTP_EMAIL_SUBJECT = "Tu código de acceso";

export function getOtpEmailText(code: string): string {
  return [
    `Tu código de acceso es ${code}.`,
    "Este código expira en 10 minutos.",
    "Si no lo solicitaste, ignorá este mensaje.",
  ].join("\n");
}

export interface RenderedOtpEmail {
  subject: string;
  html: string;
  text: string;
}

export async function renderOtp(code: string): Promise<RenderedOtpEmail> {
  const html = await render(OtpEmail, { code });
  return {
    subject: OTP_EMAIL_SUBJECT,
    html,
    text: getOtpEmailText(code),
  };
}
