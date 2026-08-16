/** Theme-token-only styles for the compact pixel learning companion. */
export const companionStyles = `
.dsh-learn-companion {
  --learn-ink: var(--dsw-alias-label-primary);
  --learn-muted: var(--dsw-alias-label-tertiary);
  --learn-panel: var(--dsw-alias-bg-layer-1);
  --learn-line: var(--dsw-alias-border-l2);
  --learn-green: var(--dsw-alias-state-success-primary);
  --learn-green-soft: var(--dsw-alias-state-success-tertiary);
  --learn-accent: var(--dsw-alias-brand-primary);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-width: 0;
  height: 48px;
  padding: 4px 8px;
  overflow: hidden;
  border: 1px solid var(--learn-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--learn-panel) 88%, transparent);
  color: var(--learn-ink);
  pointer-events: none;
  user-select: none;
  image-rendering: pixelated;
}

.dsh-learn-companion[data-wide="false"] {
  justify-content: center;
  gap: 2px;
  width: 44px;
  height: 40px;
  padding: 3px;
  border-radius: 7px;
}

.dsh-learn-scene {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  flex: 0 0 61px;
  height: 38px;
}

.dsh-learn-companion[data-wide="false"] .dsh-learn-scene {
  flex-basis: 38px;
  transform: scale(.82);
}

.dsh-learn-copy {
  min-width: 0;
  line-height: 1.15;
}

.dsh-learn-title,
.dsh-learn-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-learn-title {
  max-width: 118px;
  font-size: 11px;
  font-weight: 600;
  color: var(--learn-ink);
}

.dsh-learn-meta {
  margin-top: 3px;
  font-size: 10px;
  color: var(--learn-muted);
}

.dsh-learn-companion[data-wide="false"] .dsh-learn-copy {
  display: none;
}

.dsh-learn-cat {
  position: relative;
  width: 31px;
  height: 25px;
}

.dsh-learn-cat-body {
  position: absolute;
  left: 3px;
  bottom: 1px;
  width: 25px;
  height: 13px;
  border: 2px solid var(--learn-ink);
  border-radius: 3px 7px 4px 4px;
  background: color-mix(in srgb, var(--learn-accent) 34%, var(--learn-panel));
}

.dsh-learn-cat-head {
  position: absolute;
  left: 0;
  bottom: 9px;
  width: 17px;
  height: 14px;
  border: 2px solid var(--learn-ink);
  border-radius: 4px;
  background: color-mix(in srgb, var(--learn-accent) 42%, var(--learn-panel));
}

.dsh-learn-cat-ear {
  position: absolute;
  top: -5px;
  width: 6px;
  height: 7px;
  border: 2px solid var(--learn-ink);
  border-bottom: 0;
  background: color-mix(in srgb, var(--learn-accent) 42%, var(--learn-panel));
}

.dsh-learn-cat-ear:first-child { left: 0; clip-path: polygon(0 100%, 50% 0, 100% 100%); }
.dsh-learn-cat-ear:nth-child(2) { right: 0; clip-path: polygon(0 100%, 50% 0, 100% 100%); }

.dsh-learn-cat-eye {
  position: absolute;
  top: 6px;
  width: 2px;
  height: 2px;
  background: var(--learn-ink);
}

.dsh-learn-cat-eye:nth-of-type(1) { left: 4px; }
.dsh-learn-cat-eye:nth-of-type(2) { right: 4px; }

.dsh-learn-cat[data-sleeping="true"] .dsh-learn-cat-eye {
  width: 4px;
  height: 1px;
}

.dsh-learn-cat-tail {
  position: absolute;
  right: -1px;
  bottom: 5px;
  width: 11px;
  height: 8px;
  border: 2px solid var(--learn-ink);
  border-left: 0;
  border-bottom: 0;
  border-radius: 0 8px 0 0;
  transform-origin: 1px 7px;
}

.dsh-learn-plant {
  position: relative;
  width: 25px;
  height: 36px;
  transform-origin: 50% 100%;
}

.dsh-learn-pot {
  position: absolute;
  left: 5px;
  bottom: 0;
  width: 15px;
  height: 9px;
  border: 2px solid var(--learn-ink);
  border-top-width: 3px;
  background: color-mix(in srgb, var(--learn-accent) 28%, var(--learn-panel));
  clip-path: polygon(0 0, 100% 0, 82% 100%, 18% 100%);
}

.dsh-learn-stem {
  position: absolute;
  left: 12px;
  bottom: 10px;
  width: 2px;
  height: calc(5px + var(--plant-growth, 0px));
  max-height: 13px;
  background: var(--learn-green);
}

.dsh-learn-leaf {
  position: absolute;
  bottom: 16px;
  width: 8px;
  height: 5px;
  border: 1px solid var(--learn-ink);
  background: var(--learn-green-soft);
  opacity: 0;
}

.dsh-learn-leaf-left {
  left: 5px;
  border-radius: 6px 1px;
  transform: rotate(18deg);
}

.dsh-learn-leaf-right {
  right: 4px;
  bottom: 20px;
  border-radius: 1px 6px;
  transform: rotate(-18deg);
}

.dsh-learn-bud,
.dsh-learn-bloom {
  position: absolute;
  left: 9px;
  bottom: 26px;
  width: 7px;
  height: 7px;
  border: 1px solid var(--learn-ink);
  opacity: 0;
}

.dsh-learn-bud {
  border-radius: 5px 5px 2px 2px;
  background: color-mix(in srgb, var(--learn-accent) 55%, var(--learn-panel));
}

.dsh-learn-bloom {
  border-radius: 50%;
  background: var(--learn-accent);
  box-shadow:
    -5px 0 0 -1px var(--learn-accent),
    5px 0 0 -1px var(--learn-accent),
    0 -5px 0 -1px var(--learn-accent),
    0 5px 0 -1px var(--learn-accent);
}

.dsh-learn-plant[data-stage="2"] .dsh-learn-leaf-left,
.dsh-learn-plant[data-stage="3"] .dsh-learn-leaf,
.dsh-learn-plant[data-stage="4"] .dsh-learn-leaf,
.dsh-learn-plant[data-stage="5"] .dsh-learn-leaf { opacity: 1; }
.dsh-learn-plant[data-stage="4"] .dsh-learn-bud { opacity: 1; }
.dsh-learn-plant[data-stage="5"] .dsh-learn-bloom { opacity: 1; }
.dsh-learn-plant[data-stage="5"] .dsh-learn-bud { opacity: 0; }

.dsh-learn-companion[data-reward="true"] .dsh-learn-plant {
  animation: dsh-learn-grow 450ms steps(4, end);
}

.dsh-learn-companion[data-reward="true"] .dsh-learn-cat-tail {
  animation: dsh-learn-tail 420ms steps(3, end);
}

@keyframes dsh-learn-grow {
  0% { transform: scaleY(.9); }
  55% { transform: scaleY(1.14); }
  100% { transform: scaleY(1); }
}

@keyframes dsh-learn-tail {
  0%, 100% { transform: rotate(0); }
  50% { transform: rotate(-22deg); }
}

@media (prefers-reduced-motion: reduce) {
  .dsh-learn-companion *,
  .dsh-learn-companion *::before,
  .dsh-learn-companion *::after {
    animation: none !important;
    transition: none !important;
  }
}
`
