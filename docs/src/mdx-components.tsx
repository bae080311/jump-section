import type { MDXComponents } from 'mdx/types';
import { cn } from '@/lib/utils';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="text-4xl font-bold mb-8">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-bold mt-12 mb-4">{children}</h2>,
    p: ({ children }) => <p className="text-muted-foreground leading-7 mb-4">{children}</p>,
    code: ({ children, ...props }) => (
      <code
        {...props}
        className={cn(
          'px-1.5 py-0.5 rounded font-mono text-sm',
          // Inline code background (not inside pre)
          !props['data-language' as keyof typeof props] && 'bg-white/10 text-white',
        )}
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }) => (
      <pre {...props} className="glass p-6 rounded-2xl overflow-x-auto my-8 border border-white/10">
        {children}
      </pre>
    ),
    ...components,
  };
}
