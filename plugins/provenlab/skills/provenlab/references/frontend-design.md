# Frontend design: a site that looks designed, not generated

> **Runbook step 3 · Build,** for every page or screen people see: a Classic theme, a headless frontend, or a custom admin. Use it alongside `classic-wordpress` or `custom-app`. **Next:** step 5, verify, including the screenshot review below.

Design is part of the job. Decide the look before writing templates, build from a small set of tokens, and review screenshots before saying it is done.

## 1. Write a design brief first (three lines)

From the request, an existing site, or one question, settle:

- **Tone:** for example "calm and premium", "friendly and practical", "bold editorial".
- **Typefaces:** one for headings, one for text (or a single family). Pick real typefaces that fit the tone; avoid the default system stack on its own.
- **Color:** one neutral scale (background, surface, border, text, muted text) and **one** accent. Use the user's logo or brand colors when they have them.

Show the brief to the user in one message and continue unless they object. Existing project: take the brief from what is there and match it.

## 2. Build from design tokens, never ad-hoc values

**WordPress themes:** start from a block theme and put the tokens in `theme.json`, not in scattered CSS. For a new site, a child theme of the current default block theme is a good base (`wp theme list` shows it):

```bash
wp scaffold child-theme my-site --parent_theme=twentytwentyfive --activate
```

Define in the child theme's `theme.json` (`settings`): `color.palette` (neutrals and the accent), `typography.fontFamilies` (with `fontFace` files bundled in the theme, not loaded from a third-party CDN), `typography.fontSizes` (a scale, below), `spacing.spacingSizes`, and `layout.contentSize` / `wideSize`. Style blocks and elements in `styles`. Build pages from templates, template parts and patterns, so editors can keep the design consistent.

**Custom apps:** the same tokens as CSS variables or your framework's theme (for example Tailwind's theme), and one component library for forms, tables, dialogs and navigation (for example shadcn/ui with React) instead of hand-rolled widgets.

**Scales to use:**

| Token | Rule |
|---|---|
| Type | 5 to 7 sizes on a ratio of about 1.25 (for example 14, 16, 20, 25, 31, 39 px); body text 16 to 18 px, line height 1.5 to 1.7 |
| Spacing | Multiples of 4 or 8 px; more space between sections than inside them |
| Width | Text columns at 60 to 75 characters; one container width for the site |
| Shape | One border radius and at most one subtle shadow, used everywhere |

## 3. Layout and content

- One clear purpose and **one primary action** per page; the primary button looks different from everything else.
- Strong hierarchy: one H1, headings that read as an outline, generous whitespace, everything aligned to the same grid.
- **Real content**, never lorem ipsum: write the actual headings, labels and sample entries for the user's business, or seed realistic ones with WP-CLI.
- Images: the user's own, or generated with the Cloud AI API (`createImageGeneration`, then `createImageAltText` for alt text, `wpe-ai-plugins`). One consistent style; no random stock mix.
- Icons from one set (for example the WordPress icon library or Lucide), never emoji as icons.

**Avoid the generated look:** purple-to-blue gradients, glassmorphism, centered text everywhere, three identical feature cards with icons, "Welcome to our website" heroes, oversized drop shadows, and more than one accent color.

## 4. Accessible and responsive by default

- Contrast at least 4.5:1 for text and 3:1 for large text and controls; visible focus styles on every interactive element.
- Semantic HTML: landmarks, real buttons and links, labels on every form field, alt text on every meaningful image.
- Mobile first; check 375, 768 and 1280 px wide. Touch targets at least 44 px. No horizontal scrolling.
- Respect `prefers-reduced-motion`; keep motion short and purposeful.
- Design every state of every dynamic view: loading, empty ("No bookings yet" with the next step), error (what happened and what to do), and success.

## 5. Review screenshots before showing the user

Take screenshots of every new page at three widths with your browser tool, or Playwright:

```bash
npx playwright install chromium   # once
npx playwright screenshot --viewport-size=375,812 http://my-site.local/ home-375.png
npx playwright screenshot --viewport-size=768,1024 http://my-site.local/ home-768.png
npx playwright screenshot --viewport-size=1280,800 http://my-site.local/ home-1280.png
```

Look at them and fix before reporting: alignment, spacing rhythm, contrast, text that wraps badly, overflowing elements, empty or placeholder content, and anything on the "avoid" list. Then show the user the screenshots with the link.

## Done when

The pages follow the brief and the tokens, pass the accessibility checks, look right at all three widths, contain real content, and the user has seen the screenshots.
