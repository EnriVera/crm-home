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
    throw new Error(`Invalid SMTP URL: ${url}`);
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
