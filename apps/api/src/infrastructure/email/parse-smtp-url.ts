export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export function parseSmtpUrl(url: string): SmtpConfig {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // El mensaje va a los logs del drain loop: sin userinfo.
    throw new Error(`Invalid SMTP URL: ${redactUrlUserinfo(url)}`);
  }

  if (parsed.protocol !== "smtp:" && parsed.protocol !== "smtps:") {
    throw new Error(
      `Unsupported SMTP protocol: ${parsed.protocol}; expected smtp: or smtps:`,
    );
  }

  const port = parsed.port
    ? Number.parseInt(parsed.port, 10)
    : parsed.protocol === "smtps:"
      ? 465
      : 587;

  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid SMTP port: ${parsed.port}`);
  }

  const secure = parsed.protocol === "smtps:" || port === 465;

  const config: SmtpConfig = {
    host: parsed.hostname,
    port,
    secure,
  };

  if (parsed.username || parsed.password) {
    config.auth = {
      user: decodeURIComponent(parsed.username),
      pass: decodeURIComponent(parsed.password),
    };
  }

  return config;
}

/** Host:puerto sin userinfo, seguro para interpolar en un mensaje. */
function redactUrlUserinfo(url: string): string {
  return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)?[^/@]*@/i, "$1");
}
