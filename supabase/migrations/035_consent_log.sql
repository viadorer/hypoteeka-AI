-- ============================================================
-- 035 CONSENT LOG - GDPR audit trail for data sharing consents
-- ============================================================
-- Why: B2C lead-gen handoff to broker partners requires provable,
-- versioned consent. Lead capture today has only a checkbox; this
-- table records the exact text shown, when, and to whom.

create table if not exists public.consent_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),
  session_id uuid references public.sessions(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,

  scope text not null
    check (scope in ('handoff_partner','marketing','analytics','rate_alerts','transactional_email')),

  consent_text text not null,
  consent_text_version text not null,
  consent_text_hash text not null,

  partner_id text,

  ip_address text,
  user_agent text,

  consented_at timestamptz not null default now(),
  withdrawn_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_consent_log_tenant on public.consent_log(tenant_id);
create index if not exists idx_consent_log_session on public.consent_log(session_id);
create index if not exists idx_consent_log_lead on public.consent_log(lead_id);
create index if not exists idx_consent_log_scope on public.consent_log(scope);
create index if not exists idx_consent_log_consented_at on public.consent_log(consented_at desc);

alter table public.consent_log enable row level security;

create policy "Users can view own consents"
  on public.consent_log for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.sessions s
      where s.id = consent_log.session_id and s.user_id = auth.uid()
    )
  );

create policy "Anyone can insert consent"
  on public.consent_log for insert with check (true);

create policy "Users can withdraw own consent"
  on public.consent_log for update using (
    auth.uid() = user_id
    or exists (
      select 1 from public.sessions s
      where s.id = consent_log.session_id and s.user_id = auth.uid()
    )
  );

alter table public.leads
  add column if not exists consent_id uuid references public.consent_log(id);

create index if not exists idx_leads_consent on public.leads(consent_id);
