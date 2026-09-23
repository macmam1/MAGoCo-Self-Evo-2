# MAGoCo Design System
**Version:** 1.0.0  
**Author:** MRH-DevLoop

---

## 1. Principles
- **Professional:** Enterprise-grade look and feel.
- **Minimalist:** Clean interface, focusing on content.
- **Accessible:** WCAG 2.1 AA standards.

## 2. Typography
- **Latin:** Inter (System font fallback)
- **Farsi (RTL):** Vazirmatn
- **Base Size:** 14px

## 3. Theme
### Dark (Default)
- Background: `#0f172a` (Slate-900)
- Surface: `#1e293b` (Slate-800)
- Border: `#334155` (Slate-700)
- Text: `#f1f5f9` (Slate-100)

### Light (Optional)
- Background: `#f8fafc` (Slate-50)
- Surface: `#ffffff`
- Border: `#e2e8f0` (Slate-200)
- Text: `#0f172a` (Slate-900)

## 4. Layout Structure
- **Sidebar:** Fixed width (240px), collapsible on mobile.
- **Top Bar:** Fixed height (64px), contains Search, Notifications, User Profile.
- **Main Content:** Scrollable area below Top Bar.

## 5. UI Components
- **Cards:** Bordered, shadow on hover, rounded corners (0.5rem).
- **Buttons:** Primary (Blue-600), Secondary (Slate-600), Danger (Red-600).
- **Tables:** Striped, sortable headers.
- **Forms:** Floating labels, validation states.

## 6. Localization (i18n)
- **RTL Support:** Full bidirectional support for Farsi.
- **Date/Time:** Localized formatting (Intl.DateTimeFormat).
- **Numbers:** Localized formatting.

## 7. Tech Stack
- **Framework:** React 18+
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State:** Zustand (for global state)
- **Routing:** React Router DOM v6
