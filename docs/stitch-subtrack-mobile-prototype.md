# Stitch Prompt — SubTrack Mobile Prototype

Use this as a high-fidelity Stitch prompt for a mobile app prototype.

## Product Context

SubTrack is an offline-first mobile subscription tracker. Users add recurring subscriptions once, then track upcoming charges, monthly/yearly spend, categories, and reminders. The app should feel like a precise personal finance tool, not a playful budgeting app.

Primary user emotion: calm control. The user opens the app and immediately understands what will be charged soon, how much they spend, and whether anything needs attention today.

## Design System

**Platform:** iOS mobile app prototype, 390x844 first, responsive to modern iPhone sizes.

**Visual direction:** true dark, minimalist, tool-first, premium utility. Inspired by Linear, Vercel Dashboard, Arc Browser, and Apple Wallet. Use spacing, typography, subtle borders, and brand icon colors as the main visual hierarchy. Avoid decorative gradients, floating blobs, colorful backgrounds, marketing illustrations, and card-heavy landing-page styling.

**Palette:**
- App background: near black `#0A0A0A`
- Surface/cards/inputs: `#141414`
- Elevated border/divider: `#1F1F1F`
- Primary text: `#FAFAFA`
- Secondary text: `#A3A3A3`
- Muted text/icons: `#525252`
- Primary action: white `#FAFAFA` with black text
- Danger/urgent: `#EF4444`
- Neutral chart fill/progress: `#737373`

**Typography:**
- System iOS font.
- Large screen titles: bold, tight tracking.
- Amounts: extra large, bold, very tight tracking.
- Section labels: uppercase, small, wide tracking.
- Body copy: restrained, readable, low contrast.

**Shape and borders:**
- Cards: 16-24px radius depending on importance.
- Buttons: 16px radius.
- Inputs: 16px radius.
- Borders: 1px solid `#1F1F1F`.
- No heavy shadows. Use subtle separation through surface and border.

**Motion direction for prototype:**
- Smooth, fluid, 250-350ms.
- No bounce, no playful overshoot.
- Press feedback: subtle scale down.
- Screen transitions: fade + 12px vertical slide + subtle scale.
- List entries: staggered fade + 8px upward motion.
- Tab icon: tiny scale pulse on active tab.

## Global Navigation

Bottom tab bar with 4 tabs:

1. Home
2. Subscriptions
3. Stats
4. Settings

Tab bar:
- True black background.
- Thin top border.
- Active icon/text white.
- Inactive icon/text dark gray.
- Icons: home, credit card/list, bar chart, settings.

## Screen 1 — Onboarding / First Launch

Purpose: introduce the product and show the core value immediately.

**Structure:**
1. Top eyebrow: `SUBTRACK`
2. Hero headline: `Подписки без сюрпризов`
3. Supporting copy: `Контролируй списания, расходы за месяц и уведомления в одном спокойном интерфейсе.`
4. Large live app preview card:
   - Label: `Этот месяц`
   - Main amount: `1 126 Kč`
   - Secondary: `~13 512 Kč в год`
   - Thin month progress bar.
   - Small pulsing red status dot.
   - Three subscription rows:
     - Spotify, `149 Kč`, `через 5 дней`, green brand icon.
     - ChatGPT, `499 Kč`, `сегодня`, green/black AI icon, urgent red hint.
     - iCloud+, `79 Kč`, `через 11 дней`, blue brand icon.
5. Three compact metric tiles:
   - `3` / `напоминания перед списанием`
   - `4` / `вкладки для контроля`
   - `12` / `месяцев прогноза`
6. CTA buttons:
   - Primary white: `Создать аккаунт`
   - Secondary dark bordered: `Продолжить офлайн`

**Design notes:**
- This must not look like a generic landing page. It is the app experience itself.
- The live preview should look like an actual app panel, not an illustration.
- The hero is confident and compact; keep the next content visible.

## Screen 2 — Auth: Login / Register

Purpose: account sync, but offline mode remains valid.

**Login structure:**
- Title: `Вход`
- Subtitle: `Синхронизируй подписки между устройствами.`
- Email input
- Password input
- Primary button: `Войти`
- Secondary text button: `Продолжить офлайн`
- Link: `Нет аккаунта? Зарегистрироваться`

**Register structure:**
- Title: `Регистрация`
- Subtitle: `Аккаунт нужен только для синхронизации.`
- Email input
- Password input
- Primary button: `Создать аккаунт`
- Link: `Уже есть аккаунт? Войти`

**Design notes:**
- Inputs are dark surfaces with thin borders.
- Primary button is white with black text.
- Error state uses small red text under inputs.

## Screen 3 — Home

Purpose: fastest overview of financial status and near-term risk.

**Structure:**
1. Header:
   - Title: `SubTrack`
   - Subtitle: `Обзор подписок и списаний`
   - Optional offline/sync warning line if needed.
2. Summary card:
   - Label: `ТЕКУЩИЙ МЕСЯЦ`
   - Main amount: current normalized monthly total.
   - Secondary yearly estimate.
   - Vertical month progress bar on the right.
3. Upcoming charges horizontal row:
   - Section label: `БЛИЖАЙШИЕ СПИСАНИЯ`
   - Horizontal cards for next 7 days.
   - Each card: brand icon, service name, amount, due label.
   - Due today/overdue uses red text or red dot, not a full red background.
4. Today alert block:
   - Only when a charge is due today.
   - Red border, dark surface.
   - Button: `Оплачено`.
5. Recently added:
   - Section label: `НЕДАВНО ДОБАВЛЕННЫЕ`
   - Three list cards.
6. Floating action button:
   - Bottom right.
   - White circular button with black plus.

**Design notes:**
- The Summary card is the visual anchor.
- Upcoming row should feel scannable and compact.
- Do not overuse color. Service icons carry color.

## Screen 4 — Subscriptions List

Purpose: full management list.

**Structure:**
1. Header:
   - Title: `Подписки`
   - Sort button: `Дата`
2. Horizontal filter chips:
   - `Все`
   - `Активные`
   - `Приостановленные`
   - `Развлечения`
   - `Работа`
   - `Облако`
   - `Здоровье`
   - `Другое`
3. Subscription list cards:
   - Brand icon.
   - Service name.
   - Amount.
   - Category + period.
   - Due label.

**Example row:**
- Spotify
- `149 Kč`
- `Развлечения · Ежемесячно`
- `через 12 дней`

**Interactions to imply:**
- Tap opens detail.
- Swipe left delete.
- Swipe right pause/resume.
- Press feedback should be subtle scale.

## Screen 5 — Subscription Detail

Purpose: inspect and manage one subscription.

**Structure:**
1. Hero card:
   - Large service icon.
   - Service name.
   - Category.
2. Cost card:
   - Label: `СТОИМОСТЬ`
   - Main amount.
   - Monthly equivalent, e.g. `Эквивалент 199 Kč/мес`.
3. Renewal date card:
   - Label: `СЛЕДУЮЩЕЕ СПИСАНИЕ`
   - Date.
4. Payment history card:
   - Label: `ИСТОРИЯ ОПЛАТ`
   - Last 5 rows or empty state.
5. Actions:
   - Primary: `Отметить оплаченной`
   - Secondary: `Редактировать`
   - Secondary: `Приостановить` / `Возобновить`
   - Danger: `Удалить`

**Design notes:**
- Keep the action stack clear and touch-friendly.
- Destructive action is red text/border, not a bright filled block.

## Screen 6 — Add / Edit Subscription

Purpose: fast data entry with good defaults.

**Structure:**
1. Popular services horizontal chips:
   - Spotify, Netflix, YouTube Premium, ChatGPT, Claude, Figma, Adobe, iCloud+, Dropbox, GitHub, Notion, Vercel, Cloudflare.
2. Text inputs:
   - Name.
   - Amount.
   - Currency segmented control: CZK / EUR / USD.
3. Billing period chips:
   - Weekly.
   - Monthly.
   - Yearly.
   - Custom.
4. If custom selected:
   - Input: every X days.
5. Renewal date input.
6. Category chips.
7. Icon slug + color row.
8. Notes textarea.
9. Primary save button.

**Design notes:**
- Inputs should feel dense but not cramped.
- Selected chips are white with black text.
- Unselected chips are dark with border and muted text.

## Screen 7 — Stats

Purpose: understand spend patterns.

**Structure:**
1. Header:
   - Title: `Аналитика`
2. Period segmented control:
   - `Месяц`
   - `Квартал`
   - `Год`
3. Summary tiles:
   - Total.
   - Average.
   - Count.
4. Monthly bar chart:
   - Last 6 months.
   - Dark track, neutral gray bars.
5. Category breakdown:
   - Horizontal bars by category.
   - Category colors can be restrained: pink/work teal/cloud blue/health green/other gray.
6. Top subscriptions:
   - Sorted by normalized monthly cost.
7. Forecast card:
   - `В следующем месяце ожидается X Kč`

**Design notes:**
- Charts should be legible and quiet.
- Avoid pie-chart clutter if the prototype gets too dense; horizontal bars are acceptable.

## Screen 8 — Settings

Purpose: account, notification, display, and data controls.

**Structure:**
1. Account card:
   - Email or `Офлайн режим`
   - Button: `Выйти`
2. Notifications card:
   - Toggles:
     - `За 3 дня`
     - `За 1 день`
     - `В день списания`
   - Time: `09:00`
   - Button: `Тест уведомления`
3. Display card:
   - Currency: CZK.
   - Date format.
   - Theme: Dark.
4. Data card:
   - Export CSV later.
   - Delete all / delete account later.

**Design notes:**
- Settings should feel utilitarian and calm.
- Toggles should not have playful animation.

## Shared Components

**Service icon:**
- Rounded square.
- Brand background color.
- Bold initials.
- Very dark brand backgrounds get a visible border.

**Subscription card:**
- Dark surface.
- Thin border.
- Brand icon left.
- Main text white.
- Meta muted.
- Amount prominent.

**Summary card:**
- Dark elevated surface.
- No bright accent.
- Neutral progress indicator.

**FAB:**
- White circle.
- Black plus.
- Press scale.

## Prototype Quality Bar

Generate a polished mobile prototype, not wireframes. It should look close to a shippable iOS app. Every screen should use the same dark design language, spacing rhythm, typography hierarchy, and component shapes. Keep the interface operational and dense enough for repeated daily use.

Avoid:
- Bright gradients.
- Decorative blobs.
- Stock illustrations.
- Oversized empty hero marketing layouts.
- White cards on dark background.
- Too many colors outside service icons.
- Large explanatory text blocks inside the app.

