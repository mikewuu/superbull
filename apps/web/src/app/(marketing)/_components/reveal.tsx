'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';

type RevealProps = {
  className?: string;
  delay?: number;
  children: React.ReactNode;
};

export function Reveal(props: RevealProps): React.ReactElement {
  const { className, delay = 0, children } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      return;
    }

    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    const timeout = setTimeout(() => setVisible(true), 2500);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn('reveal', className)}
      data-animate={armed ? 'true' : undefined}
      data-visible={visible ? 'true' : undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
