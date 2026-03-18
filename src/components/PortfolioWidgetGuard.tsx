'use client';

import { useEffect } from 'react';

function removeWidgetArtifacts() {
  const ids = ['sp-assistant-widget'];
  ids.forEach((id) => {
    document.getElementById(id)?.remove();
  });

  document
    .querySelectorAll<HTMLElement>('[id^="sp-assistant-widget"]')
    .forEach((el) => el.remove());
}

export default function PortfolioWidgetGuard() {
  useEffect(() => {
    removeWidgetArtifacts();

    const observer = new MutationObserver(() => {
      removeWidgetArtifacts();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

