import { getAdminUser, unauthorizedResponse, canManageTenant, forbiddenTenantResponse } from '@/lib/admin/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  if (!tenantId) return Response.json({ error: 'tenantId required' }, { status: 400 });
  if (!canManageTenant(admin, tenantId)) return forbiddenTenantResponse(tenantId);

  // Fetch all data in parallel
  const [promptsRes, stylesRes, kbRes, tenantRes] = await Promise.all([
    supabase.from('prompt_templates').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('category').order('sort_order'),
    supabase.from('communication_styles').select('*').eq('tenant_id', tenantId).order('is_default', { ascending: false }),
    supabase.from('knowledge_base').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('category').order('sort_order'),
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
  ]);

  const prompts = promptsRes.data ?? [];
  const styles = stylesRes.data ?? [];
  const kb = kbRes.data ?? [];
  const tenant = tenantRes.data;

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let md = `# AI Konfigurace: ${tenant?.name ?? tenantId}\n\n`;
  md += `> Export: ${now}\n`;
  md += `> Tenant ID: ${tenantId}\n`;
  md += `> Agent: ${tenant?.agent_name ?? 'N/A'}\n\n`;
  md += `---\n\n`;

  // ── Prompt Templates ──
  md += `# Prompt Templates\n\n`;

  const promptsByCategory: Record<string, typeof prompts> = {};
  for (const p of prompts) {
    const cat = p.category ?? 'uncategorized';
    if (!promptsByCategory[cat]) promptsByCategory[cat] = [];
    promptsByCategory[cat].push(p);
  }

  for (const [category, items] of Object.entries(promptsByCategory)) {
    md += `## Kategorie: ${category}\n\n`;
    for (const p of items) {
      md += `### ${p.slug}`;
      if (p.phase) md += ` (fáze: ${p.phase})`;
      md += `\n\n`;
      if (p.description) md += `> ${p.description}\n\n`;
      md += `\`\`\`\n${p.content}\n\`\`\`\n\n`;
    }
  }

  md += `---\n\n`;

  // ── Communication Styles ──
  md += `# Komunikační styly\n\n`;

  for (const s of styles) {
    md += `## ${s.name}`;
    if (s.is_default) md += ` ⭐ (výchozí)`;
    md += `\n\n`;
    md += `- **Slug:** ${s.slug}\n`;
    md += `- **Tón:** ${s.tone}\n`;
    md += `- **Vykání:** ${s.use_formal_you ? 'ano' : 'ne'}\n`;
    md += `- **Max délka odpovědi:** ${s.max_response_length} slov\n`;
    if (s.description) md += `- **Popis:** ${s.description}\n`;
    md += `\n`;
    md += `### Style prompt\n\n`;
    md += `\`\`\`\n${s.style_prompt}\n\`\`\`\n\n`;
    if (s.allowed_phrases?.length > 0) {
      md += `### Povolené fráze\n\n`;
      for (const f of s.allowed_phrases) md += `- ${f}\n`;
      md += `\n`;
    }
    if (s.forbidden_phrases?.length > 0) {
      md += `### Zakázané fráze\n\n`;
      for (const f of s.forbidden_phrases) md += `- ${f}\n`;
      md += `\n`;
    }
  }

  md += `---\n\n`;

  // ── Knowledge Base ──
  md += `# Knowledge Base\n\n`;

  const kbByCategory: Record<string, typeof kb> = {};
  for (const item of kb) {
    const cat = item.category ?? 'uncategorized';
    if (!kbByCategory[cat]) kbByCategory[cat] = [];
    kbByCategory[cat].push(item);
  }

  for (const [category, items] of Object.entries(kbByCategory)) {
    md += `## Kategorie: ${category}\n\n`;
    for (const item of items) {
      md += `### ${item.title}\n\n`;
      if (item.keywords?.length > 0) {
        md += `**Klíčová slova:** ${item.keywords.join(', ')}\n\n`;
      }
      md += `${item.content}\n\n`;
    }
  }

  // Return as downloadable .md file
  const filename = `ai-config-${tenantId}-${now.slice(0, 10)}.md`;
  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
