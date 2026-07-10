import { useEffect } from 'react';
import { readUIConfig } from '../lib/read-ui-config';

export function useDocumentTitle(pageTitle: string | null): void {
  useEffect(() => {
    const boardTitle = readUIConfig().board_title ?? 'SuperBull';
    document.title = pageTitle ? `${pageTitle} · ${boardTitle}` : boardTitle;
  }, [pageTitle]);
}
