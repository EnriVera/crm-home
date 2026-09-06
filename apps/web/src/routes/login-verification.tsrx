import { LoginVerificationPage } from "../components/pages/login-verification-page.tsrx";

interface LoginVerificationRouteProps {
  /** `RenderRouteProps.url` (pathname + search): la página lee `?email=`. */
  url: string;
}

/** Entry de `/login-verification` (ruta pública de auth, D5/D9). */
export function LoginVerificationRoute(props: LoginVerificationRouteProps) @{
  <LoginVerificationPage url={props.url} />
}
