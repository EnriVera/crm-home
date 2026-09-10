import { render } from "@octanejs/email";
import Spike from "./templates/spike.tsrx";

export { default as OtpEmail } from "./templates/spike.tsrx";

export async function renderSpike(name: string): Promise<string> {
  return render(Spike, { name });
}
