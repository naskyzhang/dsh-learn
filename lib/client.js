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
		const POSITION_KEY = "dsh-learn.companion-position.v1";
		const DETAIL_WIDTH = 224;
		const EXPANDED_HEIGHT = 136;
		const VIEWPORT_MARGIN = 12;
		const ADVENTURE_DURATION = 14e3;
		const MEOW_DURATION = 3600;
		const EVOLUTION_DURATION = 3600;
		/**
		* Render a draggable pixel cat and knowledge plant in the shell overlay.
		* @param props - framework-bound companion selector.
		* @returns compact floating learning status.
		*/
		function LearnCompanion({ useCompanion }) {
			const snapshot = useCompanion((value) => value);
			const previousXp = (0, react.useRef)(null);
			const previousLevel = (0, react.useRef)(null);
			const drag = (0, react.useRef)(null);
			const moved = (0, react.useRef)(false);
			const actionTimer = (0, react.useRef)(null);
			const evolutionTimer = (0, react.useRef)(null);
			const positionRef = (0, react.useRef)(initialPosition());
			const [position, setPosition] = (0, react.useState)(positionRef.current);
			const [dragging, setDragging] = (0, react.useState)(false);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [catAction, setCatAction] = (0, react.useState)(null);
			const [reward, setReward] = (0, react.useState)(false);
			const [evolving, setEvolving] = (0, react.useState)(false);
			const [plantDebug, setPlantDebug] = (0, react.useState)(null);
			const plantDebugRef = (0, react.useRef)(null);
			plantDebugRef.current = plantDebug;
			const displayLevel = plantDebug?.level ?? snapshot.level;
			const displayProgress = plantDebug?.levelProgress ?? snapshot.levelProgress;
			const stage = Math.min(5, Math.max(1, displayLevel));
			const sleeping = catAction === null;
			const flashReward = (0, react.useCallback)(() => {
				setReward(true);
				window.setTimeout(() => {
					setReward(false);
				}, 500);
			}, []);
			const moveTo = (0, react.useCallback)((next) => {
				const bounded = clampPosition(next);
				positionRef.current = bounded;
				setPosition(bounded);
				return bounded;
			}, []);
			const startCatAction = (0, react.useCallback)((action) => {
				if (actionTimer.current !== null) window.clearTimeout(actionTimer.current);
				const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				setCatAction(action);
				actionTimer.current = window.setTimeout(() => {
					actionTimer.current = null;
					setCatAction(null);
				}, reducedMotion ? 800 : action === "adventure" ? ADVENTURE_DURATION : MEOW_DURATION);
			}, []);
			const celebrateEvolution = (0, react.useCallback)(() => {
				if (evolutionTimer.current !== null) window.clearTimeout(evolutionTimer.current);
				setEvolving(false);
				window.requestAnimationFrame(() => {
					setEvolving(true);
					startCatAction("meow");
					evolutionTimer.current = window.setTimeout(() => {
						evolutionTimer.current = null;
						setEvolving(false);
					}, EVOLUTION_DURATION);
				});
			}, [startCatAction]);
			const advancePlantDebug = (0, react.useCallback)(() => {
				setPlantDebug((current) => {
					const from = current?.level ?? Math.min(5, Math.max(1, snapshot.level));
					return {
						level: from >= 5 ? 1 : from + 1,
						levelProgress: 55
					};
				});
				celebrateEvolution();
			}, [celebrateEvolution, snapshot.level]);
			const onPointerDown = (0, react.useCallback)((event) => {
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				drag.current = {
					pointerId: event.pointerId,
					originX: event.clientX,
					originY: event.clientY,
					start: positionRef.current
				};
				moved.current = false;
				setDragging(true);
			}, []);
			const onPointerMove = (0, react.useCallback)((event) => {
				const current = drag.current;
				if (current === null || current.pointerId !== event.pointerId) return;
				const dx = event.clientX - current.originX;
				const dy = event.clientY - current.originY;
				if (!moved.current && Math.hypot(dx, dy) < 5) return;
				moved.current = true;
				moveTo({
					x: current.start.x + dx,
					y: current.start.y + dy
				});
			}, [moveTo]);
			const finishDrag = (0, react.useCallback)((event) => {
				const current = drag.current;
				if (current === null || current.pointerId !== event.pointerId) return;
				if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
				drag.current = null;
				setDragging(false);
				if (moved.current) savePosition(positionRef.current);
				else {
					const nextExpanded = !expanded;
					setExpanded(nextExpanded);
					startCatAction(nextExpanded ? "adventure" : "meow");
				}
			}, [
				advancePlantDebug,
				expanded,
				startCatAction
			]);
			const cancelDrag = (0, react.useCallback)((event) => {
				if (drag.current?.pointerId !== event.pointerId) return;
				drag.current = null;
				moved.current = false;
				setDragging(false);
			}, []);
			const onHandleKeyDown = (0, react.useCallback)((event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					const nextExpanded = !expanded;
					setExpanded(nextExpanded);
					startCatAction(nextExpanded ? "adventure" : "meow");
					return;
				}
				const step = event.shiftKey ? 32 : 12;
				const delta = {
					ArrowLeft: {
						x: -step,
						y: 0
					},
					ArrowRight: {
						x: step,
						y: 0
					},
					ArrowUp: {
						x: 0,
						y: -step
					},
					ArrowDown: {
						x: 0,
						y: step
					}
				}[event.key];
				if (delta === void 0) return;
				event.preventDefault();
				const current = positionRef.current;
				savePosition(moveTo({
					x: current.x + delta.x,
					y: current.y + delta.y
				}));
			}, [
				celebrateEvolution,
				expanded,
				flashReward,
				moveTo,
				startCatAction
			]);
			(0, react.useEffect)(() => {
				const previous = previousXp.current;
				previousXp.current = snapshot.xp;
				if (previous === null || snapshot.xp <= previous || plantDebugRef.current !== null) return;
				flashReward();
			}, [flashReward, snapshot.xp]);
			(0, react.useEffect)(() => {
				const previous = previousLevel.current;
				previousLevel.current = snapshot.level;
				if (previous === null || snapshot.level <= previous || plantDebugRef.current !== null) return;
				celebrateEvolution();
			}, [celebrateEvolution, snapshot.level]);
			(0, react.useEffect)(() => {
				const onResize = () => {
					savePosition(moveTo(positionRef.current));
				};
				window.addEventListener("resize", onResize);
				return () => {
					window.removeEventListener("resize", onResize);
				};
			}, [moveTo]);
			(0, react.useEffect)(() => {}, [celebrateEvolution, flashReward]);
			(0, react.useEffect)(() => () => {
				if (actionTimer.current !== null) window.clearTimeout(actionTimer.current);
				if (evolutionTimer.current !== null) window.clearTimeout(evolutionTimer.current);
			}, []);
			const plantStyle = { "--plant-growth": String(.94 + displayProgress * 6e-4) };
			const floatStyle = { transform: `translate3d(${position.x}px, ${position.y}px, 0)` };
			const title = plantDebug !== null ? `植物调试 · ${STAGE_NAMES[stage - 1]}` : snapshot.domainTitle ?? "学习伙伴休息中";
			const meta = plantDebug !== null ? `DEBUG LV.${stage} · ${displayProgress}% · ⌘+0 退出` : snapshot.domainId === null ? "创建课程后植物会发芽" : `${STAGE_NAMES[stage - 1]} · ${displayProgress}% · ${snapshot.dueCount} 项待复习`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-learn-float",
				style: floatStyle,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-learn-companion",
					"data-dragging": String(dragging),
					"data-expanded": String(expanded),
					"data-reward": String(reward),
					"data-evolving": String(evolving),
					"data-plant-debug": String(plantDebug !== null),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-learn-scene",
						role: "button",
						tabIndex: 0,
						"aria-expanded": expanded,
						"aria-label": `${expanded ? "收起" : "展开"}学习伙伴详情并唤醒小猫；拖动可移动；${title}，${meta}`,
						onPointerDown,
						onPointerMove,
						onPointerUp: finishDrag,
						onPointerCancel: cancelDrag,
						onKeyDown: onHandleKeyDown,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-learn-cat",
							"data-sleeping": String(sleeping),
							"data-action": catAction ?? "sleeping",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
									className: "dsh-learn-cat-sprite dsh-learn-cat-walking",
									viewBox: "0 0 72 48",
									shapeRendering: "crispEdges",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-fill",
											d: "M18 20H46V22H53V38H48V42H19V39H15V25H18Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-fill dsh-learn-cat-head-fill",
											d: "M5 16V9H9V12H19V9H23V15H27V30H24V33H8V30H5Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-fill",
											d: "M52 20H58V10H63V5H68V14H63V25H58V32H52Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-inner-ear-fill",
											d: "M8 10H11V14H8ZM19 10H22V14H19Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-light-fill",
											d: "M6 24H17V31H8V29H4V26H6Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-eye-fill",
											x: "10",
											y: "18",
											width: "3",
											height: "4"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-eye-shine-fill",
											x: "10",
											y: "18",
											width: "1",
											height: "1"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-meow-squint-fill dsh-learn-cat-meow-squint-walking",
											x: "9",
											y: "20",
											width: "6",
											height: "2"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-pink-fill",
											x: "4",
											y: "24",
											width: "3",
											height: "3"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-cheek-fill",
											x: "13",
											y: "25",
											width: "3",
											height: "3"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-smile-fill",
											x: "7",
											y: "29",
											width: "4",
											height: "2"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-meow-mouth-fill",
											d: "M8 23H15V25H17V30H15V32H8V30H6V25H8Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-meow-tongue-fill",
											d: "M9 27H14V29H15V31H8V29H9Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-meow-blush-fill",
											x: "16",
											y: "25",
											width: "4",
											height: "3"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-collar-fill",
											x: "24",
											y: "27",
											width: "5",
											height: "8"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-stripe-fill",
											x: "25",
											y: "19",
											width: "4",
											height: "8"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-stripe-fill",
											x: "34",
											y: "19",
											width: "4",
											height: "6"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-leg dsh-learn-cat-leg-front",
											d: "M20 36H28V45H19V41H20Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-leg dsh-learn-cat-leg-back",
											d: "M42 36H50V45H41V41H42Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-paw-tip-fill",
											x: "20",
											y: "41",
											width: "7",
											height: "3"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-paw-tip-fill",
											x: "42",
											y: "41",
											width: "7",
											height: "3"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-whisker-fill",
											x: "0",
											y: "28",
											width: "8",
											height: "2"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-whisker-fill",
											x: "1",
											y: "32",
											width: "9",
											height: "2"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
									className: "dsh-learn-cat-sprite dsh-learn-cat-sleeping",
									viewBox: "0 0 72 48",
									shapeRendering: "crispEdges",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-fill",
											d: "M18 22H48V25H55V40H51V44H18V41H13V29H18Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-fill dsh-learn-cat-prone-head-fill",
											d: "M5 24V15H10V19H21V15H26V24H30V41H26V44H8V41H4V28H5Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-tail-fill",
											d: "M51 25H60V29H65V38H61V42H48V37H58V32H51Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-light-fill",
											d: "M6 34H25V41H9V39H5Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-sleep-eye-fill",
											x: "9",
											y: "29",
											width: "6",
											height: "2"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-sleep-eye-fill",
											x: "20",
											y: "29",
											width: "6",
											height: "2"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-prone-eye-fill",
											x: "10",
											y: "27",
											width: "4",
											height: "5"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-prone-eye-fill",
											x: "21",
											y: "27",
											width: "4",
											height: "5"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-meow-squint-fill dsh-learn-cat-meow-squint-prone",
											x: "9",
											y: "29",
											width: "6",
											height: "2"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-meow-squint-fill dsh-learn-cat-meow-squint-prone",
											x: "20",
											y: "29",
											width: "6",
											height: "2"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-pink-fill",
											x: "15",
											y: "33",
											width: "4",
											height: "3"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-meow-mouth-fill",
											d: "M12 33H23V35H25V40H23V42H12V40H10V35H12Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-meow-tongue-fill",
											d: "M14 37H21V39H22V41H13V39H14Z"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-meow-blush-fill",
											x: "5",
											y: "34",
											width: "4",
											height: "3"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-meow-blush-fill",
											x: "26",
											y: "34",
											width: "4",
											height: "3"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-stripe-fill",
											x: "34",
											y: "22",
											width: "4",
											height: "7"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-cat-stripe-fill",
											x: "43",
											y: "23",
											width: "4",
											height: "6"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-cat-light-fill",
											d: "M23 38H42V44H22V41H23Z"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dsh-learn-zzz",
									"aria-hidden": "true",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Z" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Z" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Z" })
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-learn-meow-text",
									"aria-hidden": "true",
									children: "Miao~"
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-learn-plant",
							"data-stage": String(stage),
							style: plantStyle,
							"aria-hidden": "true",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-learn-evolution-aura" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								className: "dsh-learn-plant-sprite",
								viewBox: "0 0 64 68",
								shapeRendering: "crispEdges",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: "dsh-learn-plant-seed",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M27 40H37V43H40V47H24V43H27Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "dsh-learn-seed-shine",
											x: "29",
											y: "40",
											width: "3",
											height: "3"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
										className: "dsh-learn-plant-stem",
										d: "M29 17H35V46H29Z"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: "dsh-learn-plant-leaf dsh-learn-plant-leaf-left",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M29 39H23V37H15V33H11V25H19V27H25V31H29Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-leaf-shine",
											d: "M15 27H20V30H24V33H20V31H15Z"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: "dsh-learn-plant-leaf dsh-learn-plant-leaf-right",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M35 34H41V30H45V27H55V35H52V39H44V41H35Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-leaf-shine",
											d: "M45 30H52V33H48V36H43V33H45Z"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: "dsh-learn-plant-leaf dsh-learn-plant-leaf-upper",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M29 29H24V26H19V18H22V14H30V18H33V25H29Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-leaf-shine",
											d: "M23 18H27V21H29V24H25V22H23Z"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: "dsh-learn-plant-bud",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-bud-wrap",
											d: "M24 15V8H27V5H37V8H40V15H37V19H27V15Z"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "dsh-learn-bud-heart",
											d: "M28 9H32V11H34V9H38V14H35V17H31V14H28Z"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: "dsh-learn-plant-bloom",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-petal dsh-learn-petal-top",
												d: "M30 1H34V3H35V5H36V9H35V11H34V14H30V11H29V9H28V5H29V3H30V1Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-petal dsh-learn-petal-bottom",
												d: "M30 18H34V21H35V23H36V27H35V29H34V31H30V29H29V27H28V23H29V21H30V18Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-petal dsh-learn-petal-left",
												d: "M27 12H24V11H22V10H18V11H16V12H14V20H16V21H18V22H22V21H24V20H27V12Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-petal dsh-learn-petal-right",
												d: "M37 12H40V11H42V10H46V11H48V12H50V20H48V21H46V22H42V21H40V20H37V12Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-petal-shine",
												x: "30",
												y: "3",
												width: "2",
												height: "3"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-petal-shine",
												x: "17",
												y: "13",
												width: "3",
												height: "2"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-plant-bloom-center",
												d: "M29 11H35V13H37V19H35V21H29V19H27V13H29V11Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-bloom-shine",
												x: "30",
												y: "13",
												width: "3",
												height: "3"
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: "dsh-learn-pot",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-pot-soil",
												x: "11",
												y: "43",
												width: "42",
												height: "7"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-pot-body",
												d: "M14 49H50V58H47V65H17V58H14Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-pot-rim",
												d: "M8 42H56V51H53V54H11V51H8Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-pot-highlight",
												x: "13",
												y: "45",
												width: "9",
												height: "3"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-pot-face",
												x: "23",
												y: "56",
												width: "4",
												height: "4"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-pot-face",
												x: "37",
												y: "56",
												width: "4",
												height: "4"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-pot-smile",
												d: "M28 60H31V62H34V60H37V63H34V65H31V63H28Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-pot-blush",
												x: "18",
												y: "60",
												width: "4",
												height: "3"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "dsh-learn-pot-blush",
												x: "42",
												y: "60",
												width: "4",
												height: "3"
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: "dsh-learn-evolution-sparkles",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-sparkle dsh-learn-sparkle-a",
												d: "M8 8H12V12H16V16H12V20H8V16H4V12H8Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-sparkle dsh-learn-sparkle-b",
												d: "M52 3H55V7H59V10H55V14H52V10H48V7H52Z"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: "dsh-learn-sparkle dsh-learn-sparkle-c",
												d: "M51 27H54V30H57V33H54V36H51V33H48V30H51Z"
											})
										]
									})
								]
							})]
						})]
					}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-learn-details",
						role: "status",
						"aria-live": "polite",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-learn-title",
								children: title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-learn-meta",
								children: meta
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-learn-stats",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["LV.", displayLevel] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: plantDebug !== null ? `${displayProgress}%` : `${snapshot.xp} XP` }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["🔥 ", snapshot.streak] })
								]
							})
						]
					})]
				})
			});
		}
		function initialPosition() {
			const fallback = defaultPosition();
			try {
				const raw = window.localStorage.getItem(POSITION_KEY);
				if (raw === null) return fallback;
				const parsed = JSON.parse(raw);
				if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return fallback;
				return clampPosition({
					x: parsed.x,
					y: parsed.y
				});
			} catch {
				return fallback;
			}
		}
		function defaultPosition() {
			return clampPosition({
				x: window.innerWidth - DETAIL_WIDTH - 28,
				y: Math.round(window.innerHeight * .58)
			});
		}
		function clampPosition(position) {
			const width = Math.min(DETAIL_WIDTH, Math.max(0, window.innerWidth - 24));
			const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
			const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - EXPANDED_HEIGHT - VIEWPORT_MARGIN);
			return {
				x: Math.min(maxX, Math.max(VIEWPORT_MARGIN, Math.round(position.x))),
				y: Math.min(maxY, Math.max(VIEWPORT_MARGIN, Math.round(position.y)))
			};
		}
		function savePosition(position) {
			try {
				window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
			} catch {}
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
		/** Transparent retro-pixel companion with an on-demand status card. */
		const companionStyles = `
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
`;
		//#endregion
		//#region src/client/index.ts
		/** Browser half: mount the draggable learning companion into DSH's shell overlay. */
		const inject = ["slots", "connection"];
		/**
		* Register the companion only while the shell's additive overlay slot exists.
		* @param ctx - DSH browser context carrying slots and Connection.
		*/
		function apply(ctx) {
			const controller = new LearnCompanionController(ctx.connection);
			ctx.effect(() => controller.start(), "dsh-learn: companion state bridge");
			ctx.effect(insertStyles, "dsh-learn: companion styles");
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
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