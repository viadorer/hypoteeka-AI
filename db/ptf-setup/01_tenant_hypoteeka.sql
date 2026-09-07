-- ============================================================================
-- Tenant "hypoteeka" v PTF reality DB
--
-- Zaklada novy tenant hypoteeka.cz podle standardniho postupu PTF
-- (MULTITENANT_SETUP.md v repu ptf-reality). Struktura PTF se NIJAK nemeni —
-- jde o ciste datovy INSERT do existujicich tabulek tenants + offices.
--
-- SPUSTENI: v Supabase SQL editoru PTF projektu, PRED 02_hypoteeka_schema.sql.
-- Idempotentni (ON CONFLICT DO NOTHING) — lze spustit opakovane.
-- ============================================================================

INSERT INTO tenants (
    slug,
    name,
    company_name,
    ico,
    email,
    phone,
    domains,
    primary_domain,
    settings,
    theme
) VALUES (
    'hypoteeka',
    'Hypoteeka.cz',
    'QUADRUM s.r.o.',
    NULL,  -- TODO: doplnit ICO QUADRUM s.r.o.
    'info@ptf.cz',
    NULL,
    ARRAY['hypoteeka.cz', 'www.hypoteeka.cz'],
    'hypoteeka.cz',
    -- settings: hypoteeka je AI hypotecni asistent, ne realitni web —
    -- realitni funkce PTF frontendu vypnute, leady notifikovat emailem
    '{
        "sreality_broker_id": null,
        "sreality_sync_enabled": false,
        "lead_notifications": {
            "email": true,
            "sms": false,
            "slack_webhook": null
        },
        "features": {
            "blog": false,
            "valuations": false,
            "off_market": false,
            "virtual_tours": false
        },
        "seo": {
            "google_analytics_id": null,
            "google_tag_manager_id": null
        }
    }'::jsonb,
    '{
        "logo_url": null,
        "logo_dark_url": null,
        "favicon_url": null,
        "og_image_url": null,
        "colors": {
            "primary": "#1a365d",
            "primary_light": "#2c5282",
            "accent": "#d69e2e",
            "accent_light": "#ecc94b"
        },
        "fonts": {
            "heading": "Plus Jakarta Sans",
            "body": "Inter"
        }
    }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Pobocka (PTF checklist vyzaduje aspon jednu; adresa dle patice hypoteeka.cz)
INSERT INTO offices (
    tenant_id,
    name,
    slug,
    address_city,
    email,
    is_main,
    opening_hours
)
SELECT
    t.id,
    'Hypoteeka.cz',
    'hypoteeka-hlavni',
    'Plzeň',
    'info@ptf.cz',
    true,
    'Online — schůzky dle telefonické domluvy'
FROM tenants t
WHERE t.slug = 'hypoteeka'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- Kontrola
SELECT id, slug, name, domains FROM tenants WHERE slug = 'hypoteeka';
