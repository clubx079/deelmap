'use client';
import { createContext, useContext } from 'react';

export const BuyerPageTitleContext = createContext({
  pageTitle: '',
  setPageTitle: () => {}
});

export function useBuyerPageTitle() {
  return useContext(BuyerPageTitleContext);
}
