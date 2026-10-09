import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from '@/i18n/I18nContext'
import { queryClient } from '@/lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </I18nProvider>
)
