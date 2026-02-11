-- Migration 007: Projects table
-- Allows clients to create named projects with saved data

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) DEFAULT 'hypoteeka',
    name TEXT NOT NULL,
    description TEXT,
    client_profile JSONB DEFAULT '{}'::jsonb,
    session_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON public.projects(updated_at DESC);
