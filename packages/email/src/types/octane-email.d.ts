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

  // Components are typed loosely to avoid dragging the source-only Octane types
  // into tsc and to keep the package typecheck independent of React 19 quirks.
  export function Html(props: any): any;
  export function Head(props?: any): any;
  export function Body(props: any): any;
  export function Container(props: any): any;
  export function Section(props: any): any;
  export function Row(props: any): any;
  export function Column(props: any): any;
  export function Text(props: any): any;
  export function Button(props: any): any;
  export function Link(props: any): any;
  export function Img(props: any): any;
  export function Preview(props: any): any;
  export function Tailwind(props: any): any;
}
