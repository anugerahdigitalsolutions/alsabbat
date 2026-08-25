import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/** Generic scroll-reveal wrapper (opacity + transform only). */
export const Reveal = ({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) => {
  const [ref, shown] = useScrollReveal();

  return (
    <Tag
      ref={ref}
      className={[className, shown ? 'als-reveal-shown' : 'als-reveal-hidden'].filter(Boolean).join(' ')}
      style={{ ...(style || {}), animationDelay: shown && delay ? `${delay}ms` : undefined }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
