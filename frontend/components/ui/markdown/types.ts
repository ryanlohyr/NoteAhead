import { HTMLAttributes, ReactNode } from "react";

export interface ComponentProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}
export interface CodeProps extends ComponentProps {
  inline?: boolean;
  className?: string;
}

export interface LinkProps extends ComponentProps {
  href?: string;
}

