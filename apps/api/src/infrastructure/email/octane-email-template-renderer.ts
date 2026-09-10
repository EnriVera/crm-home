import {
  renderOtp as defaultRenderOtp,
  type RenderedOtpEmail,
} from "@crm/email";
import type {
  EmailTemplateRenderer,
  RenderedEmail,
} from "../../domain/ports/email-template-renderer";

export interface OctaneEmailTemplateRendererDeps {
  renderOtp?: (code: string) => Promise<RenderedOtpEmail>;
}

export class OctaneEmailTemplateRenderer implements EmailTemplateRenderer {
  private readonly renderEmail: (code: string) => Promise<RenderedOtpEmail>;

  constructor(deps: OctaneEmailTemplateRendererDeps = {}) {
    this.renderEmail = deps.renderOtp ?? defaultRenderOtp;
  }

  async renderOtp(input: { code: string }): Promise<RenderedEmail> {
    const rendered = await this.renderEmail(input.code);
    return {
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };
  }
}
