import { Html, Head, Body, Container, Section, Text } from "@octanejs/email";

export interface OtpEmailProps {
  code?: string;
}

export default function OtpEmail({ code = "000000" }: OtpEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "sans-serif", padding: "20px" }}>
        <Container
          style={{
            margin: "0 auto",
            padding: "24px",
            maxWidth: "480px",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
          }}
        >
          <Section>
            <Text style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>
              Tu código de acceso
            </Text>
            <Text style={{ fontSize: "16px", marginBottom: "16px" }}>
              Ingresá el siguiente código para continuar:
            </Text>
            <Text
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                letterSpacing: "6px",
                padding: "16px",
                backgroundColor: "#f0f0f0",
                textAlign: "center",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            >
              {code}
            </Text>
            <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "8px" }}>
              Este código expira en 10 minutos.
            </Text>
            <Text style={{ fontSize: "14px", color: "#666666" }}>
              Si no lo solicitaste, ignorá este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
