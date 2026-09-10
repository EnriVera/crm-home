export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplateRenderer {
  renderOtp(input: { code: string }): Promise<RenderedEmail>;
}
