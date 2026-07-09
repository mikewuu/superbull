import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { AppShell } from './components/app-shell';
import './index.css';
import { readBasePath } from './lib/read-base-path';
import { JobDetailPage } from './pages/job-detail/job-detail-page';
import { OverviewPage } from './pages/overview/overview-page';
import { QueueDetailPage } from './pages/queue-detail/queue-detail-page';

const queryClient = new QueryClient();

const basename = readBasePath().replace(/\/$/, '') || '/';

const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { path: '/', element: <OverviewPage /> },
        { path: '/queue/:queueName', element: <QueueDetailPage /> },
        { path: '/queue/:queueName/:jobId', element: <JobDetailPage /> },
      ],
    },
  ],
  { basename },
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
