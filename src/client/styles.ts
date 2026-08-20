/** Transparent retro-pixel companion with an on-demand status card. */
export const companionStyles = `
.dsh-learn-float {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: min(226px, calc(100vw - 24px));
  height: 68px;
  overflow: visible;
  pointer-events: none !important;
  will-change: transform;
}

.dsh-learn-companion {
  --learn-ink: var(--dsw-alias-label-primary, #31243a);
  --learn-muted: var(--dsw-alias-label-tertiary, #76687d);
  --learn-panel: var(--dsw-alias-bg-layer-1, #fff8df);
  --learn-line: var(--dsw-alias-border-l2, #806b78);
  --learn-accent: var(--dsw-alias-brand-primary, #a3529e);
  --pixel-outline: #523747;
  --cat-orange: #efa24c;
  --cat-light: #ffd791;
  --cat-shadow: #c76b3e;
  --cat-pink: #f68a91;
  --leaf-light: #8ed76b;
  --leaf-mid: #58ad5b;
  --leaf-dark: #2f7650;
  --pot-light: #a79ae8;
  --pot-dark: #65558f;
  --pot-rim: #d5c9ff;
  --flower-pink: #ff9fbd;
  --flower-light: #ffd2df;
  --flower-gold: #ffd466;
  position: relative;
  width: 100%;
  height: 68px;
  color: var(--learn-ink);
  pointer-events: none;
  user-select: none;
  image-rendering: pixelated;
}

.dsh-learn-scene {
  position: relative;
  width: 196px;
  height: 68px;
  overflow: visible;
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
  outline: none;
}

.dsh-learn-scene:active,
.dsh-learn-companion[data-dragging="true"] .dsh-learn-scene {
  cursor: grabbing;
}

.dsh-learn-scene:focus-visible::after {
  position: absolute;
  inset: 2px;
  border: 2px dashed var(--learn-accent);
  content: "";
  pointer-events: none;
}

.dsh-learn-details {
  position: absolute;
  left: 30px;
  z-index: 5;
  box-sizing: border-box;
  width: min(196px, calc(100vw - 24px));
  height: auto;
  min-height: 62px;
  margin: 0;
  padding: 10px 10px 9px;
  border: 2px solid var(--pixel-outline);
  background: color-mix(in srgb, var(--learn-panel) 96%, transparent);
  box-shadow:
    4px 4px 0 color-mix(in srgb, var(--pixel-outline) 55%, transparent),
    inset 2px 2px 0 color-mix(in srgb, white 45%, transparent);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  line-height: 1.2;
  pointer-events: auto;
  scrollbar-width: thin;
  animation: dsh-learn-dialog-open 140ms steps(3, end);
}

.dsh-learn-details[data-placement="below"] {
  top: 72px;
  transform-origin: 50% 0;
}

.dsh-learn-details[data-placement="above"] {
  bottom: 88px;
  transform-origin: 50% 100%;
}

.dsh-learn-title,
.dsh-learn-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-learn-title {
  color: var(--learn-ink);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
  font-weight: 800;
}

.dsh-learn-meta {
  margin-top: 4px;
  color: var(--learn-muted);
  font-size: 10px;
}

.dsh-learn-companion[data-plant-debug="true"] .dsh-learn-meta {
  color: #c47a2c;
}

.dsh-learn-stats {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  color: var(--learn-accent);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 9px;
  font-weight: 700;
}

.dsh-learn-card-summary {
  padding: 0 2px 9px;
}

.dsh-learn-tree {
  border-top: 2px solid color-mix(in srgb, var(--learn-line) 55%, transparent);
  padding-top: 8px;
}

.dsh-learn-tree-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 2px 6px;
  color: var(--learn-accent);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .5px;
}

.dsh-learn-tree-heading span:last-child {
  color: var(--learn-muted);
  font-size: 9px;
  font-weight: 700;
}

.dsh-learn-review-error {
  margin: 0 2px 6px;
  color: #d76a5f;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 9px;
  line-height: 1.35;
}

.dsh-learn-tree-list {
  display: grid;
  gap: 4px;
}

.dsh-learn-skill {
  min-width: 0;
  padding: 6px 7px;
  border-left: 2px solid color-mix(in srgb, var(--learn-accent) 45%, transparent);
  background: color-mix(in srgb, var(--learn-accent) 7%, transparent);
}

.dsh-learn-review-button {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.dsh-learn-review-button:hover .dsh-learn-skill-title,
.dsh-learn-review-button:focus-visible .dsh-learn-skill-title {
  color: var(--learn-accent);
}

.dsh-learn-review-button:focus-visible {
  outline: 1px solid var(--learn-accent);
  outline-offset: 3px;
}

.dsh-learn-review-button:disabled {
  cursor: wait;
  opacity: .68;
}

.dsh-learn-skill-line {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 5px;
}

.dsh-learn-tree-branch {
  flex: none;
  width: 11px;
  color: var(--learn-accent);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
}

.dsh-learn-skill-names {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;
}

.dsh-learn-skill-title,
.dsh-learn-skill-title-en {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-learn-skill-title {
  color: var(--learn-ink);
  font-size: 11px;
  font-weight: 800;
}

.dsh-learn-skill-title-en {
  color: var(--learn-muted);
  font-size: 9px;
  font-weight: 600;
}

.dsh-learn-skill-score {
  align-self: start;
  flex: none;
  color: var(--learn-muted);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.dsh-learn-mastery-track {
  display: block;
  height: 4px;
  margin: 5px 0 1px 16px;
  background: color-mix(in srgb, var(--learn-line) 20%, transparent);
}

.dsh-learn-mastery-track > span {
  display: block;
  height: 100%;
  min-width: 2px;
  background: var(--learn-accent);
}

.dsh-learn-resource {
  display: block;
  margin: 5px 0 0 16px;
  overflow: hidden;
  color: var(--learn-muted);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 10px;
  line-height: 1.35;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-learn-resource:hover,
.dsh-learn-resource:focus-visible {
  color: var(--learn-accent);
  text-decoration: underline;
  outline: none;
}

.dsh-learn-cat {
  position: absolute;
  left: 54px;
  bottom: -1px;
  z-index: 2;
  width: 72px;
  height: 48px;
  transform-origin: 50% 100%;
  pointer-events: none;
}

.dsh-learn-cat-sprite {
  position: absolute;
  inset: 0;
  width: 72px;
  height: 48px;
  overflow: visible;
}

.dsh-learn-cat-walking {
  display: none;
}

.dsh-learn-cat-sleeping {
  transform: scaleX(-1);
  transform-origin: 50% 50%;
}

.dsh-learn-cat-fill,
.dsh-learn-cat-tail-fill,
.dsh-learn-cat-leg {
  fill: var(--cat-orange);
  stroke: var(--pixel-outline);
  stroke-width: 3px;
  stroke-linejoin: miter;
}

.dsh-learn-cat-leg {
  transform-box: fill-box;
  transform-origin: 50% 0;
}

.dsh-learn-cat-tail-fill {
  fill: var(--cat-shadow);
  transform-box: fill-box;
  transform-origin: 20% 80%;
}

.dsh-learn-cat-light-fill {
  fill: var(--cat-light);
}

.dsh-learn-cat-eye-fill,
.dsh-learn-cat-sleep-eye-fill,
.dsh-learn-cat-prone-eye-fill,
.dsh-learn-cat-smile-fill,
.dsh-learn-cat-whisker-fill {
  fill: var(--pixel-outline);
}

.dsh-learn-cat-eye-shine-fill {
  fill: #fff8df;
}

.dsh-learn-cat-eye-fill,
.dsh-learn-cat-head-fill,
.dsh-learn-cat-prone-eye-fill,
.dsh-learn-cat-prone-head-fill {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}

.dsh-learn-cat-prone-eye-fill {
  display: none;
}

.dsh-learn-cat-pink-fill,
.dsh-learn-cat-inner-ear-fill,
.dsh-learn-cat-cheek-fill {
  fill: var(--cat-pink);
}

.dsh-learn-cat-paw-tip-fill {
  fill: var(--cat-light);
}

.dsh-learn-cat-meow-mouth-fill {
  display: none;
  fill: var(--pixel-outline);
}

.dsh-learn-cat-meow-tongue-fill {
  display: none;
  fill: var(--cat-pink);
}

.dsh-learn-cat-meow-blush-fill {
  display: none;
  fill: #f5a0a6;
}

.dsh-learn-cat-meow-squint-fill {
  display: none;
  fill: var(--pixel-outline);
}

.dsh-learn-cat-collar-fill {
  fill: #68b9bd;
  stroke: var(--pixel-outline);
  stroke-width: 2px;
}

.dsh-learn-cat-stripe-fill {
  fill: var(--cat-shadow);
}

.dsh-learn-zzz {
  position: absolute;
  left: 12px;
  top: -10px;
  display: flex;
  align-items: flex-end;
  gap: 1px;
  color: #68b9bd;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 1px 1px 0 var(--pixel-outline);
}

.dsh-learn-zzz span {
  animation: dsh-learn-zzz 3.6s steps(3, end) infinite;
}

.dsh-learn-zzz span:nth-child(2) {
  margin-bottom: 5px;
  animation-delay: 400ms;
}

.dsh-learn-zzz span:nth-child(3) {
  margin-bottom: 10px;
  animation-delay: 800ms;
}

.dsh-learn-meow-text {
  position: absolute;
  right: -20px;
  top: -10px;
  display: none;
  color: #8a8390;
  font-family: "Comic Sans MS", "Comic Sans", "Trebuchet MS", cursive;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .5px;
  line-height: 1;
  text-shadow: 1px 1px 0 #fff8df;
}

.dsh-learn-cat[data-action="adventure"] {
  animation: dsh-learn-cat-adventure 14s steps(56, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-walking {
  display: block;
  animation:
    dsh-learn-cat-walking-phase 14s steps(1, end),
    dsh-learn-cat-direction 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-sleeping {
  display: block;
  animation: dsh-learn-cat-prone-phase 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-sleep-eye-fill {
  display: block;
  animation: dsh-learn-cat-sleep-eyes 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-prone-eye-fill {
  display: block;
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-zzz {
  display: flex;
  animation: dsh-learn-action-zzz-phase 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-leg-front {
  animation: dsh-learn-action-step 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-leg-back {
  animation: dsh-learn-action-step 14s 180ms steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-prone-head-fill {
  animation: dsh-learn-look-around 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-prone-eye-fill {
  animation:
    dsh-learn-cat-awake-eyes 14s steps(1, end),
    dsh-learn-eye-look 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-meow-mouth-fill,
.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-meow-tongue-fill,
.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-meow-blush-fill,
.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-meow-squint-walking {
  display: block;
  animation: dsh-learn-adventure-meow-mouth 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-eye-fill {
  animation: dsh-learn-adventure-regular-eye 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-smile-fill {
  animation: dsh-learn-adventure-smile 14s steps(1, end);
}

.dsh-learn-cat[data-action="adventure"] .dsh-learn-meow-text {
  display: block;
  animation: dsh-learn-adventure-meow-text 14s steps(4, end);
}

.dsh-learn-cat[data-action="meow"] .dsh-learn-cat-sleep-eye-fill {
  animation: dsh-learn-meow-sleep-eyes 3.6s steps(1, end);
}

.dsh-learn-cat[data-action="meow"] .dsh-learn-cat-prone-eye-fill {
  display: block;
  animation:
    dsh-learn-meow-awake-eyes 3.6s steps(1, end),
    dsh-learn-meow-look 3.6s steps(1, end);
}

.dsh-learn-cat[data-action="meow"] .dsh-learn-cat-prone-head-fill {
  animation: dsh-learn-meow-look 3.6s steps(1, end);
}

.dsh-learn-cat[data-action="meow"] .dsh-learn-cat-meow-mouth-fill,
.dsh-learn-cat[data-action="meow"] .dsh-learn-cat-meow-tongue-fill,
.dsh-learn-cat[data-action="meow"] .dsh-learn-cat-meow-blush-fill,
.dsh-learn-cat[data-action="meow"] .dsh-learn-cat-meow-squint-prone {
  display: block;
  animation: dsh-learn-meow-mouth 3.6s steps(1, end);
}

.dsh-learn-cat[data-action="meow"] .dsh-learn-zzz {
  animation: dsh-learn-meow-zzz 3.6s steps(1, end);
}

.dsh-learn-cat[data-action="meow"] .dsh-learn-meow-text {
  display: block;
  animation: dsh-learn-meow-text 3.6s steps(4, end);
}

.dsh-learn-plant {
  position: absolute;
  right: -4px;
  bottom: -2px;
  z-index: 1;
  width: 64px;
  height: 68px;
  transform-origin: 50% 100%;
  pointer-events: none;
}

.dsh-learn-evolution-aura {
  position: absolute;
  left: 5px;
  top: 2px;
  width: 54px;
  height: 54px;
  background:
    linear-gradient(45deg, transparent 43%, #ffe48a 43% 57%, transparent 57%),
    linear-gradient(-45deg, transparent 43%, #ffe48a 43% 57%, transparent 57%);
  opacity: 0;
  transform: scale(.4);
  image-rendering: pixelated;
}

.dsh-learn-plant-sprite {
  position: relative;
  width: 64px;
  height: 68px;
  overflow: visible;
  transform: scaleY(var(--plant-growth, 1));
  transform-origin: 50% 100%;
}

.dsh-learn-plant-seed,
.dsh-learn-plant-stem,
.dsh-learn-plant-leaf,
.dsh-learn-plant-bud,
.dsh-learn-plant-bloom {
  opacity: 0;
}

.dsh-learn-plant-seed path {
  fill: #b9784d;
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  stroke-linejoin: miter;
}

.dsh-learn-seed-shine {
  fill: #f1bd75;
}

.dsh-learn-plant-stem {
  fill: var(--leaf-dark);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: 50% 100%;
}

.dsh-learn-plant-leaf {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: 50% 80%;
}

.dsh-learn-plant-leaf > path:first-child {
  fill: var(--leaf-light);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  stroke-linejoin: miter;
}

.dsh-learn-plant-leaf-right > path:first-child {
  fill: var(--leaf-mid);
}

.dsh-learn-plant-leaf-upper > path:first-child {
  fill: #a8e477;
}

.dsh-learn-leaf-shine {
  fill: #d3f49c;
}

.dsh-learn-bud-wrap {
  fill: var(--flower-pink);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  stroke-linejoin: miter;
}

.dsh-learn-bud-heart {
  fill: var(--flower-light);
}

.dsh-learn-petal {
  fill: var(--flower-pink);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  stroke-linejoin: miter;
  transform-box: fill-box;
  transform-origin: center;
}

.dsh-learn-petal-top,
.dsh-learn-petal-left {
  fill: var(--flower-light);
}

.dsh-learn-petal-bottom,
.dsh-learn-petal-right {
  fill: #f486ad;
}

.dsh-learn-petal-shine {
  fill: #fff1f6;
}

.dsh-learn-petal-shine-dim {
  fill: #ffc7d8;
}

.dsh-learn-plant-bloom-center {
  fill: var(--flower-gold);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  stroke-linejoin: miter;
}

.dsh-learn-bloom-shine {
  fill: #fff4bb;
}

.dsh-learn-bloom-seed {
  fill: #e0952f;
}

.dsh-learn-side-bloom path {
  fill: var(--flower-pink);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  stroke-linejoin: miter;
}

.dsh-learn-side-bloom-core {
  fill: var(--flower-gold);
}

.dsh-learn-side-bloom {
  transform-box: fill-box;
  transform-origin: center;
}

.dsh-learn-pot-soil {
  fill: #75533d;
  stroke: var(--pixel-outline);
  stroke-width: 2px;
}

.dsh-learn-pot-body {
  fill: var(--pot-light);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  stroke-linejoin: miter;
}

.dsh-learn-pot-rim {
  fill: var(--pot-rim);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  stroke-linejoin: miter;
}

.dsh-learn-pot-highlight {
  fill: #f0eaff;
}

.dsh-learn-pot-face,
.dsh-learn-pot-smile {
  fill: var(--pot-dark);
}

.dsh-learn-pot-blush {
  fill: #f59ab3;
}

.dsh-learn-evolution-sparkles {
  opacity: 0;
}

.dsh-learn-sparkle {
  fill: var(--flower-gold);
  stroke: var(--pixel-outline);
  stroke-width: 1px;
  transform-box: fill-box;
  transform-origin: center;
}

.dsh-learn-plant[data-stage="1"] .dsh-learn-plant-seed,
.dsh-learn-plant[data-stage="2"] .dsh-learn-plant-stem,
.dsh-learn-plant[data-stage="2"] .dsh-learn-plant-leaf-left,
.dsh-learn-plant[data-stage="3"] .dsh-learn-plant-stem,
.dsh-learn-plant[data-stage="3"] .dsh-learn-plant-leaf-left,
.dsh-learn-plant[data-stage="3"] .dsh-learn-plant-leaf-right,
.dsh-learn-plant[data-stage="4"] .dsh-learn-plant-stem,
.dsh-learn-plant[data-stage="4"] .dsh-learn-plant-leaf,
.dsh-learn-plant[data-stage="4"] .dsh-learn-plant-bud,
.dsh-learn-plant[data-stage="5"] .dsh-learn-plant-stem,
.dsh-learn-plant[data-stage="5"] .dsh-learn-plant-leaf,
.dsh-learn-plant[data-stage="5"] .dsh-learn-plant-bloom {
  opacity: 1;
}

.dsh-learn-plant[data-stage="2"] .dsh-learn-plant-stem {
  transform: scaleY(.58);
}

.dsh-learn-companion[data-reward="true"] .dsh-learn-plant {
  animation: dsh-learn-grow 450ms steps(4, end);
}

.dsh-learn-companion[data-reward="true"] .dsh-learn-cat-tail-fill {
  animation: dsh-learn-tail 420ms steps(3, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-plant {
  animation: dsh-learn-evolution-pop 3.6s steps(12, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-evolution-aura {
  animation: dsh-learn-evolution-aura 3.6s steps(8, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-evolution-sparkles {
  opacity: 1;
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-sparkle-a {
  animation: dsh-learn-sparkle-a 3.6s steps(8, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-sparkle-b {
  animation: dsh-learn-sparkle-b 3.6s 80ms steps(8, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-sparkle-c {
  animation: dsh-learn-sparkle-c 3.6s 160ms steps(8, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-plant-leaf-left {
  animation: dsh-learn-leaf-cheer-left 3.6s steps(8, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-plant-leaf-right {
  animation: dsh-learn-leaf-cheer-right 3.6s steps(8, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-plant-bloom {
  transform-box: fill-box;
  transform-origin: center;
  animation: dsh-learn-flower-bloom 3.6s steps(10, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-petal-top,
.dsh-learn-companion[data-evolving="true"] .dsh-learn-petal-bottom {
  animation: dsh-learn-petal-open-a 3.6s steps(9, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-petal-left,
.dsh-learn-companion[data-evolving="true"] .dsh-learn-petal-right {
  animation: dsh-learn-petal-open-b 3.6s steps(9, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-petal-back-left,
.dsh-learn-companion[data-evolving="true"] .dsh-learn-petal-back-right {
  animation: dsh-learn-petal-open-c 3.6s steps(9, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-side-bloom-left {
  animation: dsh-learn-side-bloom-left 3.6s steps(8, end);
}

.dsh-learn-companion[data-evolving="true"] .dsh-learn-side-bloom-right {
  animation: dsh-learn-side-bloom-right 3.6s steps(8, end);
}

@keyframes dsh-learn-dialog-open {
  0% { opacity: 0; transform: translateY(-4px) scaleY(.4); }
  100% { opacity: 1; transform: translateY(0) scaleY(1); }
}

@keyframes dsh-learn-grow {
  0% { transform: scaleY(.9); }
  55% { transform: scaleY(1.14); }
  100% { transform: scaleY(1); }
}

@keyframes dsh-learn-evolution-pop {
  0% { filter: brightness(1); transform: translateY(0) scale(.72, .35); }
  8% { filter: brightness(1.8); transform: translateY(3px) scale(.82, .5); }
  18% { filter: brightness(1.25); transform: translateY(-12px) scale(1.18, 1.22); }
  25% { transform: translateY(-5px) scale(.94, 1.06); }
  34% { transform: translateY(-10px) scale(1.08, 1.12); }
  44% { transform: translateY(0) scale(1); }
  52% { transform: translateY(-5px) rotate(-3deg); }
  60% { transform: translateY(0) rotate(3deg); }
  68%, 100% { filter: brightness(1); transform: translateY(0) rotate(0); }
}

@keyframes dsh-learn-evolution-aura {
  0%, 3%, 72%, 100% { opacity: 0; transform: scale(.35) rotate(0); }
  8% { opacity: .95; transform: scale(.7) rotate(0); }
  20% { opacity: .72; transform: scale(1.2) rotate(45deg); }
  34% { opacity: .45; transform: scale(1.48) rotate(90deg); }
  52% { opacity: .18; transform: scale(1.72) rotate(135deg); }
}

@keyframes dsh-learn-sparkle-a {
  0%, 5%, 70%, 100% { opacity: 0; transform: translate(8px, 12px) scale(.25); }
  16% { opacity: 1; transform: translate(-3px, -4px) scale(1.15); }
  34% { opacity: 1; transform: translate(-7px, -12px) scale(.8); }
  54% { opacity: 0; transform: translate(-10px, -20px) scale(.35); }
}

@keyframes dsh-learn-sparkle-b {
  0%, 8%, 75%, 100% { opacity: 0; transform: translate(-8px, 12px) scale(.2); }
  20% { opacity: 1; transform: translate(2px, -6px) scale(1.2); }
  38% { opacity: 1; transform: translate(7px, -14px) scale(.75); }
  58% { opacity: 0; transform: translate(10px, -22px) scale(.3); }
}

@keyframes dsh-learn-sparkle-c {
  0%, 12%, 78%, 100% { opacity: 0; transform: translate(-5px, 5px) scale(.25); }
  24% { opacity: 1; transform: translate(5px, -2px) scale(1); }
  44% { opacity: .9; transform: translate(10px, -9px) scale(.7); }
  62% { opacity: 0; transform: translate(14px, -15px) scale(.25); }
}

@keyframes dsh-learn-leaf-cheer-left {
  0%, 12%, 70%, 100% { transform: rotate(0) scale(1); }
  20% { transform: rotate(-14deg) scale(1.08); }
  30% { transform: rotate(8deg) scale(1.04); }
  42% { transform: rotate(-8deg) scale(1.06); }
  54% { transform: rotate(4deg) scale(1); }
}

@keyframes dsh-learn-leaf-cheer-right {
  0%, 12%, 70%, 100% { transform: rotate(0) scale(1); }
  20% { transform: rotate(14deg) scale(1.08); }
  30% { transform: rotate(-8deg) scale(1.04); }
  42% { transform: rotate(8deg) scale(1.06); }
  54% { transform: rotate(-4deg) scale(1); }
}

@keyframes dsh-learn-flower-bloom {
  0%, 8% { transform: scale(.25) rotate(-12deg); }
  18% { transform: scale(1.24) rotate(8deg); }
  28% { transform: scale(.9) rotate(-4deg); }
  38% { transform: scale(1.1) rotate(2deg); }
  50%, 100% { transform: scale(1) rotate(0); }
}

@keyframes dsh-learn-petal-open-a {
  0%, 8% { opacity: 0; transform: scale(.15) translateY(7px); }
  17% { opacity: 1; transform: scale(1.18) translateY(-2px); }
  26% { transform: scale(.92) translateY(1px); }
  38%, 100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes dsh-learn-petal-open-b {
  0%, 12% { opacity: 0; transform: scale(.15) translateX(6px); }
  21% { opacity: 1; transform: scale(1.16) translateX(-2px); }
  31% { transform: scale(.94) translateX(1px); }
  43%, 100% { opacity: 1; transform: scale(1) translateX(0); }
}

@keyframes dsh-learn-petal-open-c {
  0%, 16% { opacity: 0; transform: scale(.1) rotate(-18deg); }
  25% { opacity: 1; transform: scale(1.14) rotate(7deg); }
  35% { transform: scale(.95) rotate(-3deg); }
  47%, 100% { opacity: 1; transform: scale(1) rotate(0); }
}

@keyframes dsh-learn-side-bloom-left {
  0%, 24% { opacity: 0; transform: scale(.1) rotate(18deg); }
  34% { opacity: 1; transform: scale(1.2) rotate(-8deg); }
  44% { transform: scale(.92) rotate(4deg); }
  56%, 100% { opacity: 1; transform: scale(1) rotate(0); }
}

@keyframes dsh-learn-side-bloom-right {
  0%, 28% { opacity: 0; transform: scale(.1) rotate(-18deg); }
  38% { opacity: 1; transform: scale(1.2) rotate(8deg); }
  48% { transform: scale(.92) rotate(-4deg); }
  60%, 100% { opacity: 1; transform: scale(1) rotate(0); }
}

@keyframes dsh-learn-tail {
  0%, 100% { transform: rotate(0); }
  50% { transform: rotate(-18deg); }
}

@keyframes dsh-learn-cat-adventure {
  0%, 16% { transform: translate(0, 0); }
  23% { transform: translate(16px, 0); }
  40%, 44% { transform: translate(-29px, 0); }
  54% { transform: translate(-29px, -32px); }
  58% { transform: translate(-14px, -52px); }
  61%, 100% { transform: translate(0, 0); }
}

@keyframes dsh-learn-cat-direction {
  0%, 22% { transform: scaleX(-1); }
  23%, 39% { transform: scaleX(1); }
  40%, 54% { transform: rotate(90deg); }
  55%, 71% { transform: scaleX(-1); }
  72%, 100% { transform: scaleX(1); }
}

@keyframes dsh-learn-cat-prone-phase {
  0%, 15% { visibility: visible; }
  16%, 71% { visibility: hidden; }
  72%, 100% { visibility: visible; }
}

@keyframes dsh-learn-cat-walking-phase {
  0%, 15% { visibility: hidden; }
  16%, 71% { visibility: visible; }
  72%, 100% { visibility: hidden; }
}

@keyframes dsh-learn-cat-awake-eyes {
  0%, 15% { visibility: visible; }
  16%, 100% { visibility: hidden; }
}

@keyframes dsh-learn-cat-sleep-eyes {
  0%, 71% { visibility: hidden; }
  72%, 100% { visibility: visible; }
}

@keyframes dsh-learn-action-zzz-phase {
  0%, 79% { visibility: hidden; }
  80%, 100% { visibility: visible; }
}

@keyframes dsh-learn-action-step {
  0%, 15%, 21%, 27%, 33%, 39%, 45%, 51%, 55%, 100% { transform: translateY(0); }
  18%, 24%, 30%, 36%, 42%, 48% { transform: translateY(-3px); }
}

@keyframes dsh-learn-look-around {
  0%, 4%, 8%, 12%, 15%, 100% { transform: translateX(0); }
  6% { transform: translateX(-2px); }
  10% { transform: translateX(2px); }
}

@keyframes dsh-learn-eye-look {
  0%, 4%, 8%, 12%, 15%, 100% { transform: translateX(0); }
  6% { transform: translateX(-1px); }
  10% { transform: translateX(1px); }
}

@keyframes dsh-learn-adventure-meow-mouth {
  0%, 60%, 70%, 100% { visibility: hidden; }
  61%, 69% { visibility: visible; }
}

@keyframes dsh-learn-adventure-regular-eye {
  0%, 60%, 70%, 100% { visibility: visible; }
  61%, 69% { visibility: hidden; }
}

@keyframes dsh-learn-adventure-smile {
  0%, 60%, 70%, 100% { visibility: visible; }
  61%, 69% { visibility: hidden; }
}

@keyframes dsh-learn-adventure-meow-text {
  0%, 61%, 69%, 100% { opacity: 0; transform: translateY(3px); }
  62%, 68% { opacity: 1; transform: translateY(0); }
}

@keyframes dsh-learn-meow-awake-eyes {
  0%, 34%, 69%, 76% { visibility: visible; }
  35%, 68%, 77%, 100% { visibility: hidden; }
}

@keyframes dsh-learn-meow-sleep-eyes {
  0%, 76% { visibility: hidden; }
  77%, 100% { visibility: visible; }
}

@keyframes dsh-learn-meow-look {
  0%, 8%, 18%, 28%, 100% { transform: translateX(0); }
  13% { transform: translateX(-2px); }
  23% { transform: translateX(2px); }
}

@keyframes dsh-learn-meow-mouth {
  0%, 34%, 69%, 100% { visibility: hidden; }
  35%, 68% { visibility: visible; }
}

@keyframes dsh-learn-meow-zzz {
  0%, 76% { visibility: hidden; }
  77%, 100% { visibility: visible; }
}

@keyframes dsh-learn-meow-text {
  0%, 39%, 66%, 100% { opacity: 0; transform: translateY(3px); }
  40%, 65% { opacity: 1; transform: translateY(0); }
}

@keyframes dsh-learn-zzz {
  0%, 20% { opacity: 0; transform: translateY(3px); }
  35%, 70% { opacity: 1; transform: translateY(0); }
  90%, 100% { opacity: 0; transform: translateY(-3px); }
}

@media (prefers-reduced-motion: reduce) {
  .dsh-learn-companion *,
  .dsh-learn-companion *::before,
  .dsh-learn-companion *::after {
    animation: none !important;
    transition: none !important;
  }

  .dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-sleeping {
    display: none;
  }

  .dsh-learn-cat[data-action="meow"] .dsh-learn-cat-sleep-eye-fill,
  .dsh-learn-cat[data-action="meow"] .dsh-learn-cat-prone-eye-fill,
  .dsh-learn-cat[data-action="meow"] .dsh-learn-zzz {
    display: none;
  }

  .dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-eye-fill,
  .dsh-learn-cat[data-action="adventure"] .dsh-learn-cat-smile-fill {
    visibility: hidden;
  }
}
`
