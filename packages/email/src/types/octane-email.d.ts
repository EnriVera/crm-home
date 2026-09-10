declare module "@octanejs/email" {
  export interface RenderOptions {
    pretty?: boolean;
  }

  export type EmailComponent<Props = unknown> = (props: Props) => unknown;

  export function render<Props>(
    component: EmailComponent<Props>,
    props?: Props,
    options?: RenderOptions,
  ): Promise<string>;

  export type EmailElementProps<T = HTMLElement> = React.HTMLAttributes<T> & {
    style?: React.CSSProperties;
    ref?: React.Ref<T>;
  };

  export function Html(props: EmailElementProps<HTMLHtmlElement> & { lang?: string; dir?: string }): any;
  export function Head(props: EmailElementProps<HTMLHeadElement>): any;
  export function Body(props: EmailElementProps<HTMLBodyElement>): any;
  export function Container(props: EmailElementProps<HTMLTableElement>): any;
  export function Section(props: EmailElementProps<HTMLTableElement>): any;
  export function Row(props: EmailElementProps<HTMLTableElement>): any;
  export function Column(props: EmailElementProps<HTMLTableCellElement>): any;
  export function Text(props: EmailElementProps<HTMLParagraphElement>): any;
  export function Button(props: EmailElementProps<HTMLAnchorElement> & { href?: string }): any;
  export function Link(props: EmailElementProps<HTMLAnchorElement> & { href?: string }): any;
  export function Img(props: EmailElementProps<HTMLImageElement> & { src?: string; alt?: string; width?: string | number; height?: string | number }): any;
  export function Preview(props: { children: React.ReactNode }): any;
  export function Tailwind(props: { children: React.ReactNode }): any;
}

declare module "*.tsrx" {
  const component: (props: any) => any;
  export default component;
}
