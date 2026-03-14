'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'CAD', label: 'CAD ($)' },
  { code: 'AUD', label: 'AUD ($)' },
  { code: 'JPY', label: 'JPY (¥)' },
]

const CurrencyContext = createContext<{
  currency: string
  setCurrency: (c: string) => void
}>({ currency: 'USD', setCurrency: () => {} })

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('USD')

  useEffect(() => {
    const stored = localStorage.getItem('currency')
    if (stored) setCurrencyState(stored)
  }, [])

  function setCurrency(c: string) {
    setCurrencyState(c)
    localStorage.setItem('currency', c)
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
