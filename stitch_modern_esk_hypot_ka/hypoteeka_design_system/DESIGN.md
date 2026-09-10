---
name: Hypoteeka Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#5c3f40'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#906f70'
  outline-variant: '#e5bdbe'
  surface-tint: '#be0037'
  primary: '#b80035'
  on-primary: '#ffffff'
  primary-container: '#e11d48'
  on-primary-container: '#fffaf9'
  inverse-primary: '#ffb3b6'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#585c5d'
  on-tertiary: '#ffffff'
  tertiary-container: '#717476'
  on-tertiary-container: '#f9fbfd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdada'
  primary-fixed-dim: '#ffb3b6'
  on-primary-fixed: '#40000c'
  on-primary-fixed-variant: '#920028'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-xl-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  section-gap-desktop: 120px
  section-gap-mobile: 64px
  gutter: 24px
  container-max: 1200px
---

## Brand & Style
The design system embodies the persona of a **Friendly Expert**. It bridges the gap between traditional banking reliability and the speed of modern AI. The aesthetic is rooted in **Modern Corporate** principles with a heavy emphasis on **Soft Minimalism**. 

The goal is to evoke trust through clarity and professionalism while remaining accessible through high-quality whitespace and rounded forms. The UI avoids the cold, clinical nature of traditional finance by utilizing vibrant accents and human-centric layouts. High-quality iconography and subtle depth cues help guide users through complex financial information with ease.

## Colors
The palette is led by **Deep Navy (#0F172A)** for primary headings and structural elements to establish authority. The **Vibrant Pink (#E11D48)** acts as a high-intent signal for CTAs and interactive highlights. 

Supporting these are **Slate Grays** used for secondary text and borders to maintain a soft, non-threatening hierarchy. Surfaces utilize a mix of pure white and extremely light slate tints to define content areas without relying on heavy lines.

## Typography
The typography system uses **Inter** exclusively to leverage its exceptional legibility and modern, neutral character. 

**Display and Headlines** use tighter letter spacing and heavier weights (600-700) to command attention. **Body text** is optimized for long-form reading with generous line heights to ensure financial data remains digestible. **Labels** use medium weights and slight tracking to differentiate themselves from body copy, especially in navigation and metadata.

## Layout & Spacing
The system uses a **Fixed Grid** model for desktop to ensure the financial experience feels contained and secure. 

- **Desktop (1440px+):** 12-column grid, 1200px max-width, 24px gutters.
- **Tablet (768px - 1024px):** 8-column grid, fluid width, 24px margins.
- **Mobile (<768px):** 4-column grid, fluid width, 16px margins.

Spacing follows an 8px linear scale. Generous vertical padding between sections (120px+) is required to maintain the "premium" and "breathable" feel of the brand.

## Elevation & Depth
Depth is expressed through **Tonal Layers** and **Ambient Shadows**. 

1. **Surface 0 (Background):** Pure White (#FFFFFF) or ultra-light Slate (#F8FAFC).
2. **Surface 1 (Cards/Containers):** Pure White with a very soft, diffused shadow (15% opacity Navy, 20px blur, 4px Y-offset).
3. **Surface 2 (Floating/Modals):** Increased shadow spread and a subtle 1px border in Slate-100 to ensure clear separation from the background.

Avoid harsh black shadows; always tint shadows with the Primary Navy to maintain color harmony.

## Shapes
The shape language is defined by **Softness and Approachability**. 

Standard components (inputs, buttons) use a base radius of **8px**. Containers and Cards use a larger **16px to 24px** radius to emphasize the "friendly" nature of the brand. Use "Full Pill" shapes only for status tags or specialized iconography containers.

## Components
- **Buttons:** Primary CTAs use the Vibrant Pink background with white text. They should include a subtle scale-down effect on press. Secondary buttons use a Navy outline or a Slate-muted background.
- **Cards:** Must feature 16px+ corner radius and ambient shadows. Padding should be generous (min 32px).
- **Input Fields:** Use 8px radius with a 1px Slate-200 border. On focus, transition the border to Primary Pink with a soft glow (3px spread).
- **Chips/Badges:** Small, 12px label text, with a 4px radius or full pill. Use light tints of the primary color for positive states.
- **Lists:** High-density data lists should use subtle horizontal dividers (1px Slate-50) rather than boxes to maintain a clean vertical rhythm.
- **AI "Hugo" Elements:** Special components related to the AI assistant should use subtle gradients or a specific icon treatment to differentiate them from static content.