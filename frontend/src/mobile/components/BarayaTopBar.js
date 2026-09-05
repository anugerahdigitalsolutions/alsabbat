import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Reusable mobile header.
 *
 * Two shapes taken from the UI reference:
 *  - greeting header (avatar + greeting + actions)  → pass `left`
 *  - detail header (back arrow + centred title)      → pass `title` + `back`
 */
export const BarayaTopBar = ({
  left,
  title,
  back = false,
  backTo,
  actions,
  plain = false,
  testId = 'baraya-topbar',
}) => {
  const navigate = useNavigate();

  const goBack = () => {
    if (backTo) navigate(backTo);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <header className={`brz-topbar${plain ? ' brz-topbar--plain' : ''}`} data-testid={testId}>
      {back ? (
        <button type="button" className="brz-icon-btn" onClick={goBack} aria-label="Kembali" data-testid={`${testId}-back`}>
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
      ) : null}

      {left ? <div className="min-w-0 flex-1">{left}</div> : null}

      {title ? (
        <h1
          className="brz-clamp-1 min-w-0 flex-1 text-center text-[16px] font-semibold tracking-[-0.01em]"
          data-testid={`${testId}-title`}
        >
          {title}
        </h1>
      ) : null}

      <div className="flex flex-none items-center gap-2">{actions}</div>
    </header>
  );
};

export default BarayaTopBar;
