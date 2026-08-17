/** Transparent retro-pixel companion with an on-demand status card. */
export const companionStyles = `
.dsh-learn-float {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: min(224px, calc(100vw - 24px));
  height: 136px;
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
  --leaf-light: #7fc45b;
  --leaf-dark: #33734a;
  --pot-light: #73b9b1;
  --pot-dark: #3d7477;
  --pot-rim: #b9ded0;
  position: relative;
  width: 100%;
  height: 136px;
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
  box-sizing: border-box;
  width: min(166px, calc(100vw - 24px));
  min-height: 62px;
  margin-top: 4px;
  margin-left: 37px;
  padding: 9px 12px 8px;
  border: 2px solid var(--pixel-outline);
  background: color-mix(in srgb, var(--learn-panel) 96%, transparent);
  box-shadow:
    4px 4px 0 color-mix(in srgb, var(--pixel-outline) 55%, transparent),
    inset 2px 2px 0 color-mix(in srgb, white 45%, transparent);
  line-height: 1.2;
  pointer-events: none;
  animation: dsh-learn-dialog-open 140ms steps(3, end);
}

@media (max-width: 220px) {
  .dsh-learn-details {
    margin-left: 0;
  }
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

.dsh-learn-stats {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  color: var(--learn-accent);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 9px;
  font-weight: 700;
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
  right: 0;
  bottom: 0;
  z-index: 1;
  width: 56px;
  height: 64px;
  transform-origin: 50% 100%;
  pointer-events: none;
}

.dsh-learn-plant-sprite {
  width: 56px;
  height: 64px;
  overflow: visible;
  transform: scaleY(var(--plant-growth, 1));
  transform-origin: 50% 100%;
}

.dsh-learn-plant-stem {
  fill: var(--leaf-dark);
  stroke: var(--pixel-outline);
  stroke-width: 2px;
  transform-box: fill-box;
  transform-origin: 50% 100%;
}

.dsh-learn-plant-leaf {
  fill: var(--leaf-light);
  stroke: var(--pixel-outline);
  stroke-width: 3px;
  stroke-linejoin: miter;
  opacity: 0;
}

.dsh-learn-plant-leaf-right {
  fill: #65aa58;
}

.dsh-learn-plant-leaf-upper {
  fill: #9bd36c;
}

.dsh-learn-plant-bud,
.dsh-learn-plant-bloom {
  opacity: 0;
}

.dsh-learn-plant-bud path {
  fill: #ef8da4;
  stroke: var(--pixel-outline);
  stroke-width: 3px;
}

.dsh-learn-plant-bud rect {
  fill: #ffd166;
}

.dsh-learn-plant-bloom rect {
  fill: #f3a0b2;
  stroke: var(--pixel-outline);
  stroke-width: 2px;
}

.dsh-learn-plant-bloom .dsh-learn-plant-bloom-center {
  fill: #ffd166;
  stroke: var(--pixel-outline);
}

.dsh-learn-pot-soil {
  fill: #5d4037;
  stroke: var(--pixel-outline);
  stroke-width: 3px;
}

.dsh-learn-pot-body {
  fill: var(--pot-light);
  stroke: var(--pixel-outline);
  stroke-width: 3px;
  stroke-linejoin: miter;
}

.dsh-learn-pot-rim {
  fill: var(--pot-rim);
  stroke: var(--pixel-outline);
  stroke-width: 3px;
}

.dsh-learn-pot-highlight {
  fill: #d9f1de;
}

.dsh-learn-pot-motif {
  fill: #ffd166;
  stroke: var(--pot-dark);
  stroke-width: 2px;
}

.dsh-learn-plant[data-stage="2"] .dsh-learn-plant-leaf-left,
.dsh-learn-plant[data-stage="3"] .dsh-learn-plant-leaf-left,
.dsh-learn-plant[data-stage="3"] .dsh-learn-plant-leaf-right,
.dsh-learn-plant[data-stage="4"] .dsh-learn-plant-leaf,
.dsh-learn-plant[data-stage="5"] .dsh-learn-plant-leaf { opacity: 1; }
.dsh-learn-plant[data-stage="4"] .dsh-learn-plant-bud { opacity: 1; }
.dsh-learn-plant[data-stage="5"] .dsh-learn-plant-bloom { opacity: 1; }
.dsh-learn-plant[data-stage="1"] .dsh-learn-plant-stem { transform: scaleY(.25); }
.dsh-learn-plant[data-stage="2"] .dsh-learn-plant-stem { transform: scaleY(.65); }

.dsh-learn-companion[data-reward="true"] .dsh-learn-plant {
  animation: dsh-learn-grow 450ms steps(4, end);
}

.dsh-learn-companion[data-reward="true"] .dsh-learn-cat-tail-fill {
  animation: dsh-learn-tail 420ms steps(3, end);
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
