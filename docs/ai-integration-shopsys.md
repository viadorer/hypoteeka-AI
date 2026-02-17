# AI Asistent - Integrace do Shopsys

Kompletní průvodce pro integraci modulárního AI asistenta do Shopsys e-shopu.

## 📋 Obsah

1. [Architektura](#architektura)
2. [Základní Setup](#základní-setup)
3. [Chatbot Implementace](#chatbot-implementace)
4. [Modulární Použití](#modulární-použití)
5. [Use Cases pro E-shop](#use-cases-pro-e-shop)
6. [Best Practices](#best-practices)

---

## Architektura

### Stack
- **AI SDK:** `ai` (Vercel AI SDK v6)
- **Provider:** Google Gemini 2.0 Flash (lze změnit za OpenAI, Anthropic...)
- **Frontend:** React hooks (`useChat`, `useCompletion`)
- **Backend:** Next.js API routes (lze adaptovat na Symfony)
- **Storage:** Abstraktní interface (JSON/Supabase/PostgreSQL)

### Struktur Projektu

```
shopsys/
├── src/
│   ├── AI/
│   │   ├── Tools/              # AI nástroje (doporučení produktů, kalkulace...)
│   │   ├── Prompts/            # Prompt templates
│   │   ├── Context/            # Kontext buildery
│   │   └── Services/           # AI service layer
│   ├── Component/
│   │   ├── Front/
│   │   │   ├── ChatWidget/     # Chatbot komponenta
│   │   │   ├── ProductHelper/  # AI asistent u produktu
│   │   │   └── SmartSearch/    # AI-powered vyhledávání
│   └── Controller/
│       └── Api/
│           └── AiController.php # API endpointy
└── assets/
    └── js/
        └── ai/                  # Frontend AI komponenty
```

---

## Základní Setup

### 1. Instalace Závislostí

```bash
# Pro Next.js/React část (může být separátní microservice)
npm install ai @ai-sdk/google zod
npm install @ai-sdk/react  # Pro frontend hooks

# Nebo pro Symfony backend
composer require google/generative-ai-php
```

### 2. Environment Variables

```env
# .env.local
GOOGLE_AI_API_KEY=your-gemini-api-key
AI_MODEL=gemini-2.0-flash-exp
AI_MAX_TOKENS=2000
```

### 3. Base AI Service (Symfony)

```php
<?php
// src/AI/Services/AiService.php

namespace App\AI\Services;

use Google\GenerativeAI\Client;
use Google\GenerativeAI\GenerateContentRequest;

class AiService
{
    private Client $client;
    private string $model;
    
    public function __construct(
        string $apiKey,
        string $model = 'gemini-2.0-flash-exp'
    ) {
        $this->client = new Client($apiKey);
        $this->model = $model;
    }
    
    public function generate(
        string $prompt,
        array $context = [],
        ?string $systemPrompt = null
    ): string {
        $request = new GenerateContentRequest([
            'model' => $this->model,
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $prompt]]],
            ],
        ]);
        
        if ($systemPrompt) {
            $request->systemInstruction = $systemPrompt;
        }
        
        $response = $this->client->generateContent($request);
        return $response->text();
    }
    
    public function stream(
        string $prompt,
        callable $onChunk,
        ?string $systemPrompt = null
    ): void {
        // Streaming implementation
        $request = new GenerateContentRequest([
            'model' => $this->model,
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $prompt]]],
            ],
        ]);
        
        if ($systemPrompt) {
            $request->systemInstruction = $systemPrompt;
        }
        
        foreach ($this->client->streamGenerateContent($request) as $chunk) {
            $onChunk($chunk->text());
        }
    }
}
```

---

## Chatbot Implementace

### 1. Backend API Endpoint (Next.js/Node)

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages, sessionId, customerId } = await req.json();
  
  // Načti kontext zákazníka z DB
  const customerContext = await getCustomerContext(customerId);
  
  const result = streamText({
    model: google('gemini-2.0-flash-exp'),
    system: `Jsi AI asistent e-shopu. 
             Pomáháš zákazníkům s výběrem produktů, objednávkami a dotazy.
             
             KONTEXT ZÁKAZNÍKA:
             - Předchozí objednávky: ${customerContext.orderCount}
             - Oblíbené kategorie: ${customerContext.favoriteCategories.join(', ')}
             - Aktuální košík: ${customerContext.cartItems.length} položek
             
             PRAVIDLA:
             - Odpovídej česky
             - Buď přátelský ale profesionální
             - Nabízej konkrétní produkty pomocí nástrojů
             - Při nejasnostech se zeptej
             - NIKDY nevymýšlej ceny nebo dostupnost - vždy použij nástroje`,
    messages,
    tools: {
      search_products: {
        description: 'Vyhledej produkty podle kritérií',
        inputSchema: z.object({
          query: z.string().describe('Vyhledávací dotaz'),
          category: z.string().optional(),
          priceMax: z.number().optional(),
        }),
        execute: async ({ query, category, priceMax }) => {
          const products = await searchProducts({ query, category, priceMax });
          return { products };
        },
      },
      
      get_product_details: {
        description: 'Získej detaily konkrétního produktu',
        inputSchema: z.object({
          productId: z.number(),
        }),
        execute: async ({ productId }) => {
          const product = await getProduct(productId);
          return {
            name: product.name,
            price: product.price,
            inStock: product.inStock,
            description: product.description,
            url: product.url,
          };
        },
      },
      
      add_to_cart: {
        description: 'Přidej produkt do košíku',
        inputSchema: z.object({
          productId: z.number(),
          quantity: z.number().default(1),
        }),
        execute: async ({ productId, quantity }) => {
          await addToCart(customerId, productId, quantity);
          return { added: true, quantity };
        },
      },
      
      check_order_status: {
        description: 'Zkontroluj stav objednávky',
        inputSchema: z.object({
          orderNumber: z.string(),
        }),
        execute: async ({ orderNumber }) => {
          const order = await getOrder(orderNumber);
          return {
            status: order.status,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery,
          };
        },
      },
      
      recommend_products: {
        description: 'Doporuč produkty na základě preferencí',
        inputSchema: z.object({
          based_on: z.string().describe('Na základě čeho doporučit'),
        }),
        execute: async ({ based_on }) => {
          const recommendations = await getRecommendations(customerId, based_on);
          return { products: recommendations };
        },
      },
    },
    maxSteps: 5,
  });
  
  return result.toDataStreamResponse();
}

// Helper funkce
async function getCustomerContext(customerId: string) {
  // Načti z DB
  return {
    orderCount: 5,
    favoriteCategories: ['Elektronika', 'Knihy'],
    cartItems: [],
  };
}

async function searchProducts(params: any) {
  // Implementace vyhledávání
  return [];
}

async function getProduct(id: number) {
  // Načti produkt z DB
  return {};
}

async function addToCart(customerId: string, productId: number, quantity: number) {
  // Přidej do košíku
}

async function getOrder(orderNumber: string) {
  // Načti objednávku
  return {};
}

async function getRecommendations(customerId: string, basedOn: string) {
  // AI doporučení
  return [];
}
```

### 2. Frontend Chatbot Widget

```typescript
// components/ChatWidget.tsx
'use client';

import { useState } from 'react';
import { useChat } from 'ai/react';
import { MessageCircle, X, Send } from 'lucide-react';

export function ChatWidget({ customerId }: { customerId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { customerId },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Dobrý den! Jsem váš AI asistent. Jak vám mohu pomoci?',
      },
    ],
  });
  
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
      
      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-2xl">
            <h3 className="font-semibold">AI Asistent</h3>
            <p className="text-sm opacity-90">Jsme tu pro vás 24/7</p>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content}
                  
                  {/* Render tool results */}
                  {message.toolInvocations?.map((tool) => (
                    <div key={tool.toolCallId} className="mt-2 p-2 bg-white/10 rounded">
                      {tool.toolName === 'get_product_details' && tool.result && (
                        <ProductCard product={tool.result} />
                      )}
                      {tool.toolName === 'search_products' && tool.result && (
                        <ProductList products={tool.result.products} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Napište zprávu..."
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// Helper komponenty
function ProductCard({ product }: { product: any }) {
  return (
    <div className="bg-white rounded-lg p-3 text-gray-900">
      <h4 className="font-semibold">{product.name}</h4>
      <p className="text-sm text-gray-600">{product.price} Kč</p>
      <p className="text-xs text-green-600">{product.inStock ? 'Skladem' : 'Není skladem'}</p>
      <a href={product.url} className="text-blue-600 text-sm hover:underline">
        Zobrazit detail →
      </a>
    </div>
  );
}

function ProductList({ products }: { products: any[] }) {
  return (
    <div className="space-y-2">
      {products.slice(0, 3).map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      {products.length > 3 && (
        <p className="text-xs text-gray-500">+ {products.length - 3} dalších produktů</p>
      )}
    </div>
  );
}
```

---

## Modulární Použití

### 1. AI Doporučení Produktů (bez chatu)

```typescript
// components/ProductRecommendations.tsx
'use client';

import { useCompletion } from 'ai/react';
import { useEffect } from 'react';

export function ProductRecommendations({ 
  productId, 
  customerId 
}: { 
  productId: number; 
  customerId?: string; 
}) {
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/recommend',
  });
  
  useEffect(() => {
    complete(JSON.stringify({ productId, customerId }));
  }, [productId]);
  
  if (isLoading) return <div>Načítám doporučení...</div>;
  if (!completion) return null;
  
  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="font-semibold mb-2">💡 AI Doporučení</h3>
      <p className="text-sm">{completion}</p>
    </div>
  );
}
```

**Backend:**
```typescript
// app/api/recommend/route.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const { productId, customerId } = JSON.parse(prompt);
  
  const product = await getProduct(productId);
  const customerHistory = await getCustomerHistory(customerId);
  
  const result = streamText({
    model: google('gemini-2.0-flash-exp'),
    system: `Jsi AI asistent pro doporučení produktů. 
             Analyzuj produkt a historii zákazníka a navrh 2-3 vhodné doplňkové produkty.
             Odpověz v 1-2 větách, buď konkrétní.`,
    prompt: `Produkt: ${product.name} (${product.category})
             Historie zákazníka: ${customerHistory.map(p => p.name).join(', ')}
             
             Doporuč vhodné doplňkové produkty.`,
    maxTokens: 150,
  });
  
  return result.toTextStreamResponse();
}
```

### 2. Smart Search (AI-powered vyhledávání)

```typescript
// components/SmartSearch.tsx
'use client';

import { useState } from 'react';
import { useCompletion } from 'ai/react';

export function SmartSearch() {
  const [query, setQuery] = useState('');
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/smart-search',
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    complete(query);
  };
  
  return (
    <div>
      <form onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Např: 'Potřebuji dárek pro maminku do 1000 Kč'"
          className="w-full px-4 py-2 border rounded"
        />
      </form>
      
      {isLoading && <div>Hledám...</div>}
      
      {completion && (
        <div className="mt-4">
          <h3>AI našlo:</h3>
          <div dangerouslySetInnerHTML={{ __html: completion }} />
        </div>
      )}
    </div>
  );
}
```

### 3. Motivační Zprávy (povzbuzení)

```typescript
// components/CheckoutMotivation.tsx
'use client';

import { useCompletion } from 'ai/react';
import { useEffect } from 'react';

export function CheckoutMotivation({ 
  cartTotal, 
  freeShippingThreshold 
}: { 
  cartTotal: number; 
  freeShippingThreshold: number; 
}) {
  const { completion, complete } = useCompletion({
    api: '/api/motivate',
  });
  
  useEffect(() => {
    const remaining = freeShippingThreshold - cartTotal;
    if (remaining > 0 && remaining < 500) {
      complete(`Zákazník má v košíku ${cartTotal} Kč, do dopravy zdarma zbývá ${remaining} Kč`);
    }
  }, [cartTotal]);
  
  if (!completion) return null;
  
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <p className="text-sm">🎉 {completion}</p>
    </div>
  );
}
```

**Backend:**
```typescript
// app/api/motivate/route.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  const result = streamText({
    model: google('gemini-2.0-flash-exp'),
    system: `Jsi motivační asistent e-shopu. 
             Povzbuzuj zákazníky k dokončení nákupu krátkými, pozitivními zprávami.
             Buď přátelský, ne agresivní. Max 1 věta.`,
    prompt,
    maxTokens: 50,
  });
  
  return result.toTextStreamResponse();
}
```

### 4. AI Popis Produktu (generování)

```typescript
// app/api/generate-description/route.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { productName, category, features } = await req.json();
  
  const result = streamText({
    model: google('gemini-2.0-flash-exp'),
    system: `Jsi copywriter pro e-shop. 
             Piš SEO-optimalizované popisy produktů.
             Používej klíčová slova, buď konkrétní, zvýrazni výhody.`,
    prompt: `Produkt: ${productName}
             Kategorie: ${category}
             Vlastnosti: ${features.join(', ')}
             
             Napiš poutavý popis produktu (150-200 slov).`,
    maxTokens: 300,
  });
  
  return result.toTextStreamResponse();
}
```

---

## Use Cases pro E-shop

### 1. **Zákaznická Podpora (24/7)**
- Odpovědi na časté dotazy
- Sledování objednávek
- Reklamace a vrácení
- Technická podpora

### 2. **Produktové Doporučení**
- Personalizované návrhy
- Cross-sell / Up-sell
- "Lidé také kupují..."
- Doplňkové produkty

### 3. **Smart Vyhledávání**
- Přirozený jazyk ("dárek pro maminku")
- Kontextové filtrování
- Oprava překlepů
- Synonyma a varianty

### 4. **Konverzní Optimalizace**
- Motivační zprávy
- Urgence (omezená zásoba)
- Sociální důkaz
- Personalizované nabídky

### 5. **Content Generování**
- Popisy produktů
- Meta descriptions
- Alt texty obrázků
- Blog články

### 6. **Analýza Sentimentu**
- Hodnocení produktů
- Zákaznické recenze
- Feedback analýza

---

## Best Practices

### 1. **Bezpečnost**

```typescript
// Vždy validuj vstupy
import { z } from 'zod';

const userInputSchema = z.object({
  query: z.string().max(500),
  customerId: z.string().uuid(),
});

// Sanitizuj výstupy
function sanitizeAiResponse(text: string): string {
  // Odstraň potenciálně nebezpečný obsah
  return text
    .replace(/<script>/gi, '')
    .replace(/javascript:/gi, '');
}
```

### 2. **Rate Limiting**

```typescript
// Middleware pro rate limiting
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requestů za minutu
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too many requests', { status: 429 });
  }
  
  // ... zbytek kódu
}
```

### 3. **Caching**

```typescript
// Cache AI odpovědí pro časté dotazy
import { cache } from 'react';

const getCachedResponse = cache(async (query: string) => {
  const cached = await redis.get(`ai:${query}`);
  if (cached) return cached;
  
  const response = await generateAiResponse(query);
  await redis.set(`ai:${query}`, response, { ex: 3600 }); // 1 hodina
  
  return response;
});
```

### 4. **Monitoring**

```typescript
// Logování AI interakcí
async function logAiInteraction(data: {
  customerId: string;
  query: string;
  response: string;
  toolsUsed: string[];
  duration: number;
}) {
  await db.aiLogs.create({ data });
}

// Tracking úspěšnosti
async function trackConversion(sessionId: string, converted: boolean) {
  await db.aiSessions.update({
    where: { id: sessionId },
    data: { converted, convertedAt: new Date() },
  });
}
```

### 5. **Fallback Strategie**

```typescript
async function generateWithFallback(prompt: string) {
  try {
    // Primární: Gemini
    return await generateWithGemini(prompt);
  } catch (error) {
    console.error('Gemini failed, falling back to OpenAI', error);
    try {
      // Fallback: OpenAI
      return await generateWithOpenAI(prompt);
    } catch (error2) {
      console.error('OpenAI failed, using template', error2);
      // Fallback: Předpřipravená odpověď
      return getTemplateResponse(prompt);
    }
  }
}
```

### 6. **A/B Testing**

```typescript
// Testuj různé AI prompty
function getPromptVariant(userId: string): string {
  const variant = hash(userId) % 2;
  
  return variant === 0
    ? 'Jsi přátelský asistent...' // Varianta A
    : 'Jsi profesionální poradce...'; // Varianta B
}

// Track výsledky
async function trackVariantPerformance(
  userId: string,
  variant: string,
  metric: 'satisfaction' | 'conversion'
) {
  await analytics.track({
    userId,
    event: `ai_${metric}`,
    properties: { variant },
  });
}
```

---

## Integrace do Shopsys

### Symfony Controller

```php
<?php
// src/Controller/Api/AiController.php

namespace App\Controller\Api;

use App\AI\Services\AiService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;

class AiController extends AbstractController
{
    public function __construct(
        private AiService $aiService
    ) {}
    
    #[Route('/api/ai/chat', methods: ['POST'])]
    public function chat(Request $request): StreamedResponse
    {
        $data = json_decode($request->getContent(), true);
        $messages = $data['messages'] ?? [];
        $customerId = $data['customerId'] ?? null;
        
        $response = new StreamedResponse();
        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('X-Accel-Buffering', 'no');
        
        $response->setCallback(function() use ($messages, $customerId) {
            $this->aiService->stream(
                $this->buildPrompt($messages),
                function($chunk) {
                    echo "data: " . json_encode(['text' => $chunk]) . "\n\n";
                    ob_flush();
                    flush();
                },
                $this->getSystemPrompt($customerId)
            );
        });
        
        return $response;
    }
    
    private function buildPrompt(array $messages): string
    {
        return end($messages)['content'] ?? '';
    }
    
    private function getSystemPrompt(?string $customerId): string
    {
        return 'Jsi AI asistent e-shopu...';
    }
}
```

---

## Závěr

Tato architektura ti umožňuje:

✅ **Modulární použití** - AI kdekoli v aplikaci  
✅ **Škálovatelnost** - Snadné přidání nových use cases  
✅ **Flexibilita** - Swap AI providerů bez změny kódu  
✅ **Testovatelnost** - Každá komponenta samostatně  
✅ **Bezpečnost** - Rate limiting, validace, sanitizace  

**Další kroky:**
1. Nastav API klíče
2. Implementuj základní chatbot
3. Přidej produktové nástroje (search, recommend...)
4. Rozšiř o další use cases podle potřeby
5. Monitoruj a optimalizuj

**Potřebuješ pomoc s konkrétní částí?** Řekni mi a ukážu ti přesnou implementaci.
