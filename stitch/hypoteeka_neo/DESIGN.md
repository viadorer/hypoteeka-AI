# Design System Document

## 1. Overview & Creative North Star

This design system is built to transform complex financial data into a high-end, editorial-grade digital experience. We move beyond the "fintech blue" cliché to create a signature aesthetic that is both authoritative and visionary.

**Creative North Star: "The Intelligent Curator"**
The system is designed to feel like a premium concierge—clean, hyper-efficient, and deeply professional. We achieve this through "The Digital Breath": expansive white space (`surface`), intentional asymmetry, and a refusal to use traditional grid lines. By overlapping elements and utilizing extreme typographic contrast, we signal an "AI-first" intelligence that is sophisticated rather than robotic. The interface doesn't just display information; it curates it.

---

## 2. Colors

Our palette is anchored by the tension between the depth of the Deep Navy and the kinetic energy of Vibrant Pink.

### Core Tones
- **Primary (`#b80049` / `primary`):** Used sparingly for high-impact CTAs and critical status indicators.
- **On-Surface (`#001a41` / `on-surface`):** Our "Deep Navy." Used for primary text and brand-heavy headers to establish trust.
- **Surface (`#f9f9ff` / `surface`):** The canvas. This is a deliberate "cool white" that feels clinical and modern.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be defined solely through:
1. **Background Shifts:** Placing a `surface-container-low` section against a `surface` background.
2. **Negative Space:** Using the Spacing Scale (specifically `8`, `12`, and `16`) to create structural separation.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the **Surface Container Tier** to define importance:
- **`surface-container-lowest` (#ffffff):** Used for the most interactive, "top-level" cards (e.g., active chat bubbles, primary stats).
- **`surface-container` (#e9edff):** Used for background groupings.
- **`surface-container-highest` (#d8e2ff):** Reserved for subtle accents or hover states.

### The "Glass & Gradient" Rule
To evoke a sense of "AI fluidity," floating elements (like the chat input bar or floating navigation) should utilize **Glassmorphism**. Apply `surface` at 80% opacity with a `20px` backdrop blur. Use subtle linear gradients transitioning from `primary` (#b80049) to `primary_container` (#e2165f) on main CTAs to add "visual soul" and depth.

---

## 3. Typography

We utilize **Inter** as a single-family system, relying on extreme scale and weight shifts to create an editorial feel.

- **Display (display-lg, display-md):** High-impact, semi-bold weights for hero sections. Use wide tracking (-0.02em) to feel "tight" and professional.
- **Headline (headline-lg):** The primary voice of the interface. Use these for section titles to command attention.
- **Body (body-lg, body-md):** Set at regular weight. Ensure line heights are generous (1.5x) to maintain "The Digital Breath."
- **Labels (label-md, label-sm):** Always uppercase with +0.05em tracking when used for categorization or "AI status" indicators.

The hierarchy is designed to be "Top-Heavy," where the gap between Headline and Body size is purposefully large, mimicking a premium broadsheet or luxury magazine.

---

## 4. Elevation & Depth

We eschew traditional drop shadows for **Tonal Layering**. Depth is a result of color proximity, not artificial lighting.

### The Layering Principle
To create "lift" without shadows, stack containers:
- Place a `surface-container-lowest` card on a `surface-container-low` section. The subtle shift from `#ffffff` to `#f1f3ff` creates a sophisticated, natural edge.

### Ambient Shadows
When a floating effect is mandatory (e.g., a modal or the primary chat trigger), use an **Ambient Shadow**:
- **Blur:** 40px - 60px.
- **Opacity:** 4% - 6%.
- **Color:** Use `on-surface` (#001a41) as the shadow base rather than pure black. This creates a "navy-tinted" shadow that feels integrated into the brand.

### The "Ghost Border" Fallback
If accessibility requirements demand a border, use a **Ghost Border**: `outline-variant` (#e4bdc2) at 15% opacity. Never use a 100% opaque border.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `full` roundedness, white text. Add a `primary_fixed` glow on hover.
- **Secondary:** `surface-container-lowest` background with `on-surface` text. No border.
- **Tertiary:** Text-only with an icon. Use `title-sm` for the font weight.

### Cards & Stats
- **Rule:** No dividers. Use `spacing-6` (2rem) as a vertical gutter between content blocks.
- **Styling:** Use `md` (0.75rem) or `lg` (1rem) corner radius. Use `surface-container-lowest` for the card body to make it "pop" against the `surface` background.

### Sleek Chat Interface
- **Input Field:** A floating `surface-container-lowest` pill with `full` roundedness and a subtle Ambient Shadow. 
- **AI Bubbles:** Use `secondary_container` background with `on-secondary-container` text to distinguish AI responses from user responses (`primary`).
- **Interaction:** Use `backdrop-blur` on the chat header to maintain a sense of context as the user scrolls.

### Input Fields
- **Default State:** `surface-container-low` background, no border.
- **Focus State:** 1px "Ghost Border" using `primary` at 40% opacity and a soft inner glow.
- **Error State:** Use `error` (#ba1a1a) only for the helper text and a 2px vertical "accent bar" on the left side of the input, rather than outlining the whole box.

---

## 6. Do's and Don'ts

### Do
- **DO** use asymmetry. Place a high-contrast stat card overlapping a background section transition to break the "boxed-in" feel.
- **DO** use `secondary_fixed` (#d8e2ff) for large background decorative elements or "AI pulse" animations.
- **DO** maintain a minimum of `spacing-12` (4rem) between major editorial sections.

### Don't
- **DON'T** use 1px solid black or grey borders. This immediately destroys the premium, custom feel.
- **DON'T** use traditional Material Design "Elevation" shadows (Level 1-5). Stick to Tonal Layering or Ambient Shadows.
- **DON'T** crowd the interface. If a screen feels "full," increase the `surface` (white space) before reducing font sizes.
- **DON'T** use standard "Fintech Blue" icons. Use custom, thin-stroke (1.5px) icons in `on-surface` or `primary` to maintain the editorial aesthetic.