window.__ModuleLoader__.load({
	id: "dsh-learn",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/LearnCompanion.tsx
		const STAGE_NAMES = [
			"种子",
			"嫩芽",
			"叶丛",
			"花苞",
			"开花"
		];
		/**
		* Render a passive pixel cat and knowledge plant in the sidebar footer.
		* @param props - sidebar width plus the framework-bound companion selector.
		* @returns compact, non-interactive learning status.
		*/
		function LearnCompanion({ wide, useCompanion }) {
			const snapshot = useCompanion((value) => value);
			const previousXp = (0, react.useRef)(null);
			const [reward, setReward] = (0, react.useState)(false);
			const stage = Math.min(5, Math.max(1, snapshot.level));
			const sleeping = snapshot.domainId === null;
			(0, react.useEffect)(() => {
				const previous = previousXp.current;
				previousXp.current = snapshot.xp;
				if (previous === null || snapshot.xp <= previous) return;
				setReward(true);
				const timer = window.setTimeout(() => {
					setReward(false);
				}, 500);
				return () => {
					window.clearTimeout(timer);
				};
			}, [snapshot.xp]);
			const plantStyle = { "--plant-growth": `${Math.round(snapshot.levelProgress * .08)}px` };
			const title = sleeping ? "学习伙伴休息中" : snapshot.domainTitle ?? "学习伙伴";
			const meta = sleeping ? "创建课程后植物会发芽" : `${STAGE_NAMES[stage - 1]} · ${snapshot.levelProgress}% · ${snapshot.dueCount} 项待复习`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-learn-companion",
				"data-wide": String(wide),
				"data-reward": String(reward),
				role: "status",
				"aria-live": "polite",
				"aria-label": `${title}，${meta}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-learn-scene",
					"aria-hidden": "true",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-learn-cat",
						"data-sleeping": String(sleeping),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-cat-body" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-learn-cat-head",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-cat-ear" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-cat-ear" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-cat-eye" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-cat-eye" })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-cat-tail" })
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-learn-plant",
						"data-stage": String(stage),
						style: plantStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-stem" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-leaf dsh-learn-leaf-left" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-leaf dsh-learn-leaf-right" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-bud" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-bloom" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-pot" })
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-learn-copy",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-learn-title",
						children: title
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-learn-meta",
						children: meta
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/controller.ts
		const EMPTY_SNAPSHOT = Object.freeze({
			domainId: null,
			domainTitle: null,
			xp: 0,
			level: 1,
			levelProgress: 0,
			streak: 0,
			dueCount: 0,
			revision: ""
		});
		/** Browser-side long-poll controller exposed to React as one stable observable. */
		var LearnCompanionController = class {
			connection;
			snapshot = EMPTY_SNAPSHOT;
			listeners = /* @__PURE__ */ new Set();
			constructor(connection) {
				this.connection = connection;
			}
			getSnapshot = () => this.snapshot;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			/** Start the cancellable long-poll loop. */
			start() {
				const abort = new AbortController();
				this.run(abort.signal);
				return () => {
					abort.abort();
				};
			}
			async run(signal) {
				while (!signal.aborted) try {
					const result = await this.connection.rpc.call("/dsh-learn", "companion", { revision: this.snapshot.revision }, signal);
					if (!result.ok) throw new Error(result.error.message);
					this.publish(parseSnapshot(result.value));
				} catch (error) {
					if (signal.aborted) return;
					console.warn("[dsh-learn] companion sync failed; retrying", error);
					await abortableDelay(3e3, signal);
				}
			}
			publish(next) {
				if (next.revision === this.snapshot.revision) return;
				this.snapshot = next;
				for (const listener of [...this.listeners]) listener();
			}
		};
		function parseSnapshot(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Host returned an invalid dsh-learn snapshot");
			const input = value;
			if (input.domainId !== null && typeof input.domainId !== "string" || input.domainTitle !== null && typeof input.domainTitle !== "string" || !isNatural(input.xp) || !isNatural(input.level) || input.level < 1 || !isNatural(input.levelProgress) || input.levelProgress > 100 || !isNatural(input.streak) || !isNatural(input.dueCount) || typeof input.revision !== "string") throw new Error("Host returned a malformed dsh-learn snapshot");
			return {
				domainId: input.domainId,
				domainTitle: input.domainTitle,
				xp: input.xp,
				level: input.level,
				levelProgress: input.levelProgress,
				streak: input.streak,
				dueCount: input.dueCount,
				revision: input.revision
			};
		}
		function isNatural(value) {
			return Number.isInteger(value) && value >= 0;
		}
		async function abortableDelay(ms, signal) {
			if (signal.aborted) return;
			await new Promise((resolve) => {
				const timer = window.setTimeout(finish, ms);
				const abort = () => {
					finish();
				};
				function finish() {
					window.clearTimeout(timer);
					signal.removeEventListener("abort", abort);
					resolve();
				}
				signal.addEventListener("abort", abort, { once: true });
			});
		}
		//#endregion
		//#region src/client/styles.ts
		/** Theme-token-only styles for the compact pixel learning companion. */
		const companionStyles = `
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
`;
		//#endregion
		//#region src/client/index.ts
		/** Browser half: mount the passive learning companion into DSH's sidebar. */
		const inject = ["slots", "connection"];
		/**
		* Register the companion only while the sidebar's additive footer slot exists.
		* @param ctx - DSH browser context carrying slots and Connection.
		*/
		function apply(ctx) {
			const controller = new LearnCompanionController(ctx.connection);
			ctx.effect(() => controller.start(), "dsh-learn: companion state bridge");
			ctx.effect(insertStyles, "dsh-learn: companion styles");
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "dsh-learn-companion",
				inject: () => ({ hooks: { companion: controller } })
			}, LearnCompanion));
		}
		function insertStyles() {
			if (document.querySelector("style[data-plugin-css=\"dsh-learn/companion\"]") !== null) return () => {};
			const style = document.createElement("style");
			style.dataset.plugin = "dsh-learn";
			style.dataset.pluginCss = "dsh-learn/companion";
			style.textContent = companionStyles;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map