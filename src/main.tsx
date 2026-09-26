import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { TooltipProvider } from './components/ui'
import './styles.css'
import './app/workspace.css'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => !('status' in error && Number(error.status) < 500) && count < 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={350}>
        <App />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
