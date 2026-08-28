import type { ButtonHTMLAttributes, ReactNode } from 'react';

export default function Button({ variant = 'secondary', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet'; children: ReactNode }) {
  return <button {...props} className={`button ${variant === 'primary' ? 'primary' : ''} ${props.className ?? ''}`}>{children}</button>;
}
