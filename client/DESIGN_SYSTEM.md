# Atrarium Dashboard Design System

## Button Color Palette & Usage Guidelines

### Button Variants

#### 1. **Primary (default)**
- **Usage**: Main actions, CTAs (Call-to-Action)
- **Examples**:
  - "New Post" button (floating action button)
  - "Login" button
  - Form submit buttons
- **Variant**: `variant="default"`
- **Color**: Primary brand color with shadow
- **States**: Hover darkens by 10% (`hover:bg-primary/90`)

#### 2. **Outline**
- **Usage**: Secondary actions, non-critical operations
- **Examples**:
  - "Logout" button in sidebar
  - Cancel buttons
  - Navigation back buttons
- **Variant**: `variant="outline"`
- **Color**: Transparent with border, hover fills with accent color
- **States**: Hover shows accent background

#### 3. **Ghost**
- **Usage**: Tertiary actions, subtle interactions
- **Examples**:
  - "Hide" post button (moderation)
  - Icon buttons in lists
  - Dropdown triggers
- **Variant**: `variant="ghost"`
- **Color**: Transparent, hover shows accent background
- **States**: Minimal visual weight, hover for feedback

#### 4. **Destructive**
- **Usage**: Dangerous or irreversible actions
- **Examples**:
  - Delete buttons
  - "Yes, Hide Post" confirmation
  - Remove member actions
- **Variant**: `variant="destructive"`
- **Color**: Red/destructive color with shadow
- **States**: Hover darkens by 10%

#### 5. **Secondary**
- **Usage**: Alternative actions, less emphasis than primary
- **Examples**:
  - Alternative form actions
  - Complementary buttons in button groups
- **Variant**: `variant="secondary"`
- **Color**: Secondary color (muted) with shadow
- **States**: Hover darkens by 20%

#### 6. **Link**
- **Usage**: Text-only actions, inline actions
- **Examples**:
  - "Learn more" links
  - Navigation links styled as buttons
- **Variant**: `variant="link"`
- **Color**: Primary color, underlined on hover
- **States**: Underline on hover

### Button Sizes

- **`size="sm"`**: Compact buttons (height: 32px, text: xs)
  - Sidebar actions
  - In-card actions

- **`size="default"`**: Standard buttons (height: 36px, text: sm)
  - Form buttons
  - Most UI actions

- **`size="lg"`**: Large buttons (height: 40px, text: sm, padding: lg)
  - Floating action buttons (FAB)
  - Landing page CTAs

- **`size="icon"`**: Square icon-only buttons (36x36px)
  - Close buttons
  - Icon-only actions

### Current Usage in Atrarium

#### Floating Action Buttons (FAB)
- **New Post**: `variant="default"` + `size="lg"` + `className="fixed bottom-6 right-6 shadow-lg"`
- **Login to Post**: `variant="default"` + `size="lg"` + `className="fixed bottom-6 right-6 shadow-lg"`

#### Sidebar
- **Logout**: `variant="outline"` + `size="sm"` + `className="w-full"`
- **Login**: `variant="default"` + `size="sm"` + `className="w-full"`

#### Moderation
- **Hide (in post card)**: `variant="ghost"` + `size="sm"`
- **Yes, Hide Post (dialog)**: `variant="destructive"` + `disabled={isHiding}`
- **Cancel (dialog)**: `variant="outline"`

#### Forms
- **Post button**: `variant="default"` + `className="w-full"`

### Design Principles

1. **Hierarchy**: Use visual weight to indicate importance
   - Primary > Outline > Ghost

2. **Consistency**: Same actions should use same button styles across the app
   - All logout buttons: outline
   - All destructive actions: destructive variant
   - All CTAs: primary variant

3. **Accessibility**: Ensure sufficient color contrast (WCAG AA minimum)
   - All variants meet contrast requirements
   - Focus states visible (ring on focus)

4. **Spacing**: Maintain consistent spacing around buttons
   - Minimum touch target: 44x44px (accessible)
   - Spacing between buttons: 8-16px (gap-2 to gap-4)

5. **States**: All buttons have clear interactive states
   - Default, Hover, Focus, Active, Disabled
   - Disabled: 50% opacity, no pointer events

### Color Tokens (defined in CSS variables)

See [tailwind.config.ts](tailwind.config.ts) for full token definitions:

- `--primary`: Main brand color
- `--primary-foreground`: Text on primary background
- `--secondary`: Secondary/muted color
- `--destructive`: Red for dangerous actions
- `--accent`: Hover/highlight color
- `--border`: Border color
- `--ring`: Focus ring color

### Examples

```tsx
// Primary action (CTA)
<Button variant="default" size="lg">
  <Plus className="mr-2 h-5 w-5" />
  New Post
</Button>

// Secondary action
<Button variant="outline" onClick={handleCancel}>
  Cancel
</Button>

// Destructive action
<Button variant="destructive" onClick={handleDelete}>
  Delete Post
</Button>

// Subtle action
<Button variant="ghost" size="sm">
  Hide
</Button>

// Icon-only button
<Button variant="ghost" size="icon">
  <X className="h-4 w-4" />
</Button>
```

## Future Considerations

- Add `success` variant for positive confirmations (e.g., "Saved!")
- Add `warning` variant for cautionary actions
- Consider adding `loading` state with spinner
