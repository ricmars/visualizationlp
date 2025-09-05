### Modals — minimal pattern

- Render via `ModalPortal` into `#main-content-area` (not `document.body`).
- Use absolute positioning, not `fixed`.
- Overlay: `absolute inset-0 bg-black/50 backdrop-blur-sm z-[80] modal-overlay`.
- Content: `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90]` and `role="dialog"`.
- Z-index order: base `z-0..10` < overlay `z-[80]` < content `z-[90]` < selection overlay `z-[100]` < quick chat `z-[110]`.
- Dark theme classes from `globals.css` (no inline styles). For tall content, make inner body scrollable.

```tsx
// Correct usage
<ModalPortal isOpen={isOpen}>
  <div data-modal-portal="true">
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[80] modal-overlay"
      onClick={onClose}
    />
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90]"
      role="dialog"
    >
      {/* modal content */}
    </div>
  </div>
  {/* content renders inside #main-content-area */}
</ModalPortal>
```

Checklist

- [ ] Wrapped in `ModalPortal`
- [ ] Absolute positioning only
- [ ] Overlay includes `modal-overlay`
- [ ] Content includes `role="dialog"`
- [ ] Respects z-index hierarchy
- [ ] Uses semantic classes from `globals.css`
