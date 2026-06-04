/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as affiliateApproved } from './affiliate-approved.tsx'
import { template as affiliateRejected } from './affiliate-rejected.tsx'
import { template as paymentConfirmed } from './payment-confirmed.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'affiliate-approved': affiliateApproved,
  'affiliate-rejected': affiliateRejected,
  'payment-confirmed': paymentConfirmed,
}
