import { LoginPage } from "../components/pages/login-page.tsrx";

interface LoginRouteProps {
  /** `RenderRouteProps.url` (pathname + search): la página lee `?reauth=`. */
  url: string;
}

/** Entry de `/login` (ruta pública de auth, D5/D9). */
export function LoginRoute(props: LoginRouteProps) @{
  <LoginPage url={props.url} />
}
