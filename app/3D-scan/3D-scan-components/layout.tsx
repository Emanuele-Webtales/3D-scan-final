'use client';

import NextLink from 'next/link';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const tags = [
  {
    name: '#WebGPU',
    href: 'https://tympanus.net/codrops/demos/?tag=webgpu',
  },
  {
    name: '#Three.js',
    href: 'https://tympanus.net/codrops/demos/?tag=three-js',
  },
  {
    name: '#TSL',
    href: 'https://tympanus.net/codrops/demos/?tag=tsl',
  },
];

const Link = ({
  href,
  target,
  className,
  children,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
}) => {
  return (
    <NextLink
      target={target}
      className={`pointer-events-auto hover:underline ${className}`}
      href={href}
    >
      {children}
    </NextLink>
  );
};

export const Layout = () => {
  const pathname = usePathname();

  return (
    <div
      data-layout
      className={
        'absolute inset-0 z-50 h-screen w-full pointer-events-none p-5 text-xs md:p-10 md:text-sm'
      }
    >
    </div>
  );
};
