# Development Guidelines - Sheopal's Drive

To maintain the premium quality and consistency of the application, all developers MUST adhere to the following rules:

## 🎨 Unified Design System & Theming
- **Theme-Aware Colors**: Never use hardcoded hex or RGB colors for backgrounds/text. Always use Tailwind theme variables.
  - ✅ Correct: `bg-background/80`, `text-foreground`, `border-border/50`
  - ❌ Incorrect: `bg-[#000000]`, `text-white`
- **Glassmorphism**: Use `backdrop-blur-xl` and semi-transparent backgrounds for modern, premium-feeling overlays (modals, dropdowns, headers).
- **Dark & Light Mode**: Every component must look stunning in both modes. Test changes by toggling the theme.

## ⚡ Data Fetching & State
- **TanStack Query (React Query)**: Use `useQuery` for fetching and `useMutation` for actions (rename, star, delete).
- **Custom Hooks**: Abstract all API logic into the `src/hooks/` directory. Components should rarely call the API directly.
- **API Client**: Always use the centralized `apiClient` from `@/lib/api-client`. Do not use raw `fetch` or create new `axios` instances.
- **Optimistic UI**: Implement optimistic updates for common actions like starring/unstarring to provide immediate user feedback.

## 🛠️ Components & UI
- **Shadcn UI**: Priority should be given to existing Shadcn components. Customize them using `cn()` and theme variables.
- **Z-Index Layering**: 
  - Overlays/Modals: `z-[100]`
  - Dialogs on top of Modals: `z-[120]`
  - Tooltips/Dropdowns: `z-[130]`
- **No Placeholders**: Use real media or generated assets. Never leave components empty or skeletal.

## 📢 User Feedback
- **Toasts**: Use `sonner` for all user feedback. 
  - Use `toast.loading()` for async operations and update them with `.success()` or `.error()`.
- **Loading States**: Always handle pending/loading states visually (e.g., disabling buttons, showing spinners).

## 📁 File Management & Routing
- **Server Actions**: Use Next.js Route Handlers for file operations to ensure security.
- **MIME Types**: Handle file previews based on MIME types (Images, PDFs, etc.).
- **Breadcrumbs**: Maintain functional breadcrumbs for all folder levels.

---
*Failure to follow these rules will result in a declined PR. Let's build something beautiful.*
