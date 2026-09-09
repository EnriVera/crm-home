import { useRef, useState } from "octane";
import {
  createOtpMachine,
  type OtpMachine,
  type OtpState,
} from "../../../lib/otp/otp-machine";
import { createRpcOtpVerifier } from "../../../lib/otp/rpc-verifier";
import { StatusMessage } from "../../atoms/status-message.tsrx";
import { useT } from "../../vendor/i18n";
import { OtpInput } from "../../vendor/otp-input";

export interface OtpFormProps {
  /** Email destino del código (solo para contexto accesible del grupo). */
  email: string;
}

/**
 * Organismo del formulario OTP (D9, PRD §8.1): `OtpInput` (wrapper vendor) +
 * máquina de estados pura. Intentos y expiración se muestran como DATOS de la
 * máquina (nunca strings hardcodeados). El change de auth inyecta el verifier
 * real vía RPC sin tocar UI ni máquina.
 */
export function OtpForm(props: OtpFormProps) @{
  const t = useT();

  const machineRef = useRef<OtpMachine | null>(null);
  if (machineRef.current === null) {
    machineRef.current = createOtpMachine({
      verifier: createRpcOtpVerifier(props.email),
    });
  }
  const machine = machineRef.current;

  const [state, setState] = useState<OtpState>(() => machine.getState());

  const handleComplete = (code: string) => {
    machine.setCode(code);
    const submission = machine.submit();
    setState(machine.getState()); // submitting (deshabilita celdas)
    void submission.then(() => setState(machine.getState())); // error | expired
  };

  const busy = state.status === "submitting";
  const exhausted =
    state.status === "error" && state.attemptsRemaining === 0;
  const locked = busy || state.status === "expired" || exhausted;

  <div class="flex flex-col gap-4">
    <OtpInput
      aria-label={t("auth.otp.inputLabel")}
      disabled={locked}
      invalid={state.status === "error"}
      onComplete={handleComplete}
    />
    {busy ? (
      <p class="m-0 text-sm text-text-secondary" role="status">
        {t("auth.otp.verifying")}
      </p>
    ) : null}
    {state.status === "error" ? (
      <StatusMessage variant="error">
        {t("auth.otp.errorInvalid")} {t("auth.otp.attemptsLabel")}{" "}
        {state.attemptsRemaining}/{state.maxAttempts}
      </StatusMessage>
    ) : null}
    {state.status === "expired" ? (
      <StatusMessage variant="error">{t("auth.otp.expired")}</StatusMessage>
    ) : null}
    <button
      type="button"
      disabled
      title={t("auth.otp.resendDisabled")}
      class="cursor-not-allowed self-start rounded-md bg-transparent px-0 py-1 text-sm text-text-secondary opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {t("auth.otp.resend")}
    </button>
  </div>
}
