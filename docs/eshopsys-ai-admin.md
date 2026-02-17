# AI Admin Panel pro Eshopsys - Multi-tenant

Kompletní admin pro správu AI asistenta v Eshopsys projektu.

## Soubory k přidání do Eshopsys.com/

### 1. Database Migration

```sql
-- backend/src/database/migrations/001_ai_admin.sql

CREATE TABLE ai_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) UNIQUE NOT NULL,
  tenant_name VARCHAR(255) NOT NULL,
  ai_provider VARCHAR(50) DEFAULT 'google',
  ai_model VARCHAR(100) DEFAULT 'gemini-2.0-flash-exp',
  api_key_encrypted TEXT,
  chatbot_enabled BOOLEAN DEFAULT true,
  chatbot_name VARCHAR(100) DEFAULT 'AI Asistent',
  chatbot_primary_color VARCHAR(7) DEFAULT '#0066FF',
  max_tokens INTEGER DEFAULT 2000,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  features JSONB DEFAULT '{"product_recommendations":true,"order_tracking":true}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) REFERENCES ai_tenants(tenant_id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) REFERENCES ai_tenants(tenant_id),
  session_id VARCHAR(100) NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count INTEGER DEFAULT 0,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Backend API Controller

```typescript
// backend/src/ai/controllers/AiAdminController.ts

import { Request, Response } from 'express';

export class AiAdminController {
  async listTenants(req: Request, res: Response) {
    const tenants = await db.query('SELECT * FROM ai_tenants ORDER BY created_at DESC');
    res.json({ tenants: tenants.rows });
  }
  
  async updateTenant(req: Request, res: Response) {
    const { tenantId } = req.params;
    const updates = req.body;
    
    await db.query(
      `UPDATE ai_tenants SET 
       chatbot_name = $1, 
       chatbot_primary_color = $2,
       temperature = $3,
       max_tokens = $4
       WHERE tenant_id = $5`,
      [updates.chatbot_name, updates.chatbot_primary_color, updates.temperature, updates.max_tokens, tenantId]
    );
    
    res.json({ success: true });
  }
  
  async listPrompts(req: Request, res: Response) {
    const { tenantId } = req.params;
    const prompts = await db.query('SELECT * FROM ai_prompts WHERE tenant_id = $1', [tenantId]);
    res.json({ prompts: prompts.rows });
  }
  
  async createPrompt(req: Request, res: Response) {
    const { tenantId } = req.params;
    const { slug, category, title, content } = req.body;
    
    const result = await db.query(
      'INSERT INTO ai_prompts (tenant_id, slug, category, title, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tenantId, slug, category, title, content]
    );
    
    res.json({ prompt: result.rows[0] });
  }
}
```

### 3. Frontend Admin Pages

```typescript
// frontend/src/pages/admin/ai/index.tsx - Seznam tenantů

export default function AiTenantsPage() {
  const [tenants, setTenants] = useState([]);
  
  useEffect(() => {
    fetch('/api/admin/ai/tenants')
      .then(r => r.json())
      .then(data => setTenants(data.tenants));
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">AI Asistenti</h1>
      {tenants.map(t => (
        <div key={t.id} className="bg-white p-6 rounded-lg mb-4">
          <h3>{t.tenant_name}</h3>
          <Link href={`/admin/ai/${t.tenant_id}/config`}>Konfigurace</Link>
        </div>
      ))}
    </div>
  );
}
```

```typescript
// frontend/src/pages/admin/ai/[tenantId]/config.tsx - Konfigurace

export default function ConfigPage() {
  const { tenantId } = useRouter().query;
  const [config, setConfig] = useState(null);
  
  const handleSave = async () => {
    await fetch(`/api/admin/ai/tenants/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  };
  
  return (
    <div className="p-8">
      <h1>Konfigurace AI</h1>
      <input value={config?.chatbot_name} onChange={e => setConfig({...config, chatbot_name: e.target.value})} />
      <input type="color" value={config?.chatbot_primary_color} />
      <button onClick={handleSave}>Uložit</button>
    </div>
  );
}
```

## Instalace

1. Zkopíruj SQL do `Eshopsys.com/backend/src/database/migrations/`
2. Spusť migraci: `psql -d eshopsys -f 001_ai_admin.sql`
3. Zkopíruj TypeScript soubory do příslušných složek
4. Přidej routes do `backend/src/index.ts`
5. Přidej menu položku do admin sidebaru

Hotovo! Admin je připravený k použití.
