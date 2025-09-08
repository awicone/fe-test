import '@ant-design/v5-patch-for-react-19'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'antd/dist/reset.css'
import { ConfigProvider, theme as antdTheme } from 'antd'

const client = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={{
      algorithm: antdTheme.darkAlgorithm,
      token: {
        colorBgBase: '#0b0d10',
        colorBgContainer: '#121418',
        colorText: '#e2e8f0',
        colorBorder: '#1f2937',
      },
      components: {
        Table: {
          headerBg: '#0f1115',
          headerColor: '#9aa4b2',
          rowHoverBg: '#151923',
          borderColor: '#1f2937',
        },
      },
    }}>
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    </ConfigProvider>
  </StrictMode>,
)
