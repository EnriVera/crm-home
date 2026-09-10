import { writeFileSync } from "node:fs";

const dts = `export declare const OtpEmail: (props: { code: string }) => any;
export declare const OTP_EMAIL_SUBJECT = "Tu código de acceso";
export declare function getOtpEmailText(code: string): string;
export interface RenderedOtpEmail {
  subject: string;
  html: string;
  text: string;
}
export declare function renderOtp(code: string): Promise<RenderedOtpEmail>;
`;

writeFileSync("dist/index.d.ts", dts);
console.log("dist/index.d.ts written");
