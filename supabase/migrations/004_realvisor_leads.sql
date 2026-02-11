-- Migration 004: Add Realvisor lead/contact IDs to leads table
-- Allows pairing our leads with Realvisor CRM for future communication

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS realvisor_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS realvisor_contact_id TEXT;

-- Index for quick lookup by Realvisor IDs
CREATE INDEX IF NOT EXISTS idx_leads_realvisor_lead_id ON leads(realvisor_lead_id) WHERE realvisor_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_realvisor_contact_id ON leads(realvisor_contact_id) WHERE realvisor_contact_id IS NOT NULL;
