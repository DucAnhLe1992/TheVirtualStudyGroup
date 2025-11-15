# Page Design System Guide

## Design Consistency Improvements ✨

All dedicated pages now follow the same design pattern as the main application for a seamless user experience.

## Page Structure

### Standard Layout (All Pages)
```
┌─────────────────────────────────────────┐
│            Header Component              │
├─────────┬───────────────────────────────┤
│         │                               │
│ Sidebar │    Main Content Area          │
│         │    (p-4 md:p-6)              │
│         │                               │
│         │                               │
└─────────┴───────────────────────────────┘
```

### Common Elements

**1. Container:**
- `min-h-screen` - Full viewport height
- `bg-gray-50 dark:bg-gray-900` - Consistent background
- `transition-colors` - Smooth dark mode transitions

**2. Header:**
- Logo/branding on left
- User menu on right
- Hamburger menu for mobile sidebar

**3. Sidebar:**
- Collapsible on mobile
- Active tab highlighted
- Consistent across all pages

**4. Main Content:**
- `flex-1` - Takes remaining space
- `p-4 md:p-6` - Responsive padding
- Responsive breakpoints match dashboard

## Page-Specific Designs

### PostPage
```tsx
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
  <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
  <div className="flex">
    <Sidebar activeTab="posts" ... />
    <main className="flex-1 p-4 md:p-6">
      <PostDetailView ... />
    </main>
  </div>
</div>
```

**Features:**
- Full post with comments
- Reaction buttons
- Share functionality
- Sidebar shows "Posts" as active
- Close button → navigates to `/posts`

### GroupPage
```tsx
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
  <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
  <div className="flex">
    <Sidebar activeTab="groups" ... />
    <main className="flex-1 p-4 md:p-6">
      <EnhancedGroupDetailView ... />
    </main>
  </div>
</div>
```

**Features:**
- Tabbed interface (Overview, Posts, Chat, Resources, Quizzes, Sessions)
- Member management
- Group settings
- Sidebar shows "Groups" as active
- Close button → navigates to `/groups`

### SessionLobbyPage
```tsx
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
  <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
  <div className="flex">
    <Sidebar activeTab="sessions" ... />
    <main className="flex-1 p-4 md:p-6">
      <button onClick={backToSessions}>← Back to Sessions</button>
      <SessionLobby ... />
    </main>
  </div>
</div>
```

**Features:**
- Live chat interface
- Poll creation/voting
- Participant list
- Back button above content
- Sidebar shows "Sessions" as active
- Back button → navigates to `/sessions`

## Navigation Behavior

### Always Return to Parent ✅

**Before (Issues):**
- `navigate(-1)` could go anywhere in browser history
- Could navigate outside the app
- Unpredictable behavior when using direct URLs

**After (Fixed):**
- PostPage → Always navigates to `/posts`
- GroupPage → Always navigates to `/groups`
- SessionLobbyPage → Always navigates to `/sessions`
- Predictable, consistent behavior

### Implementation Pattern
```tsx
const handleClose = () => {
  navigate('/posts'); // Always go to parent
};

// NOT: navigate(-1) ❌
// YES: navigate('/posts') ✅
```

## Color Palette

### Light Mode
- Background: `bg-gray-50`
- Cards: `bg-white`
- Borders: `border-gray-200`
- Text Primary: `text-gray-900`
- Text Secondary: `text-gray-600`
- Accent: `text-blue-600`

### Dark Mode
- Background: `bg-gray-900`
- Cards: `bg-gray-800`
- Borders: `border-gray-700`
- Text Primary: `text-white`
- Text Secondary: `text-gray-400`
- Accent: `text-blue-400`

## Spacing System

**Padding:**
- Mobile: `p-4`
- Desktop: `md:p-6`

**Margins:**
- Section spacing: `mb-6` or `mb-8`
- Card gaps: `gap-4` or `gap-6`

**Rounded Corners:**
- Cards: `rounded-lg`
- Buttons: `rounded-lg`
- Inputs: `rounded-lg`

## Responsive Breakpoints

```tsx
// Mobile first approach
className="p-4 md:p-6 lg:p-8"

// Grid layouts
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

**Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## Component Consistency

### Buttons
```tsx
// Primary
className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg 
           hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"

// Secondary
className="px-4 py-2 border border-gray-300 dark:border-gray-600 
           text-gray-700 dark:text-gray-300 rounded-lg 
           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
```

### Cards
```tsx
className="bg-white dark:bg-gray-800 rounded-lg border 
           border-gray-200 dark:border-gray-700 p-6 
           hover:shadow-md transition-all"
```

### Inputs
```tsx
className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
           bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
           rounded-lg focus:outline-none focus:ring-2 
           focus:ring-blue-500 dark:focus:ring-blue-400"
```

## Animation & Transitions

**Color Transitions:**
```tsx
className="transition-colors" // For dark mode
```

**Interactive Elements:**
```tsx
className="transition-all" // For hover effects
```

**Loading States:**
```tsx
<div className="animate-spin rounded-full h-12 w-12 
                border-b-2 border-blue-600 dark:border-blue-400" />
```

## Accessibility

**Focus States:**
- Always include `focus:outline-none focus:ring-2 focus:ring-blue-500`
- Visible keyboard navigation

**Color Contrast:**
- Meets WCAG AA standards
- Dark mode preserves contrast ratios

**Semantic HTML:**
- Use `<main>`, `<nav>`, `<header>` appropriately
- Proper heading hierarchy

## Benefits of Consistent Design

✅ **Familiar Navigation** - Users always know where they are  
✅ **Predictable Behavior** - Close always goes to parent  
✅ **Seamless Experience** - No jarring layout changes  
✅ **Mobile Friendly** - Responsive sidebar on all pages  
✅ **Dark Mode** - Consistent theming throughout  
✅ **Professional Look** - Cohesive design language  

## Testing Checklist

When adding new pages:
- [ ] Includes Header component
- [ ] Includes Sidebar component
- [ ] Uses consistent padding (`p-4 md:p-6`)
- [ ] Implements dark mode classes
- [ ] Close/back buttons navigate to parent route
- [ ] Active tab highlighted in sidebar
- [ ] Responsive on mobile
- [ ] Smooth transitions
- [ ] Loading states match pattern
- [ ] Follows color palette

---

**Result:** All pages now look and feel like part of the same application! 🎨
