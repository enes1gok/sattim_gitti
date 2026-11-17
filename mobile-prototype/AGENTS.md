# Mobile Prototype Agent Guide

## Connected marketplace (current default)

- First-visit setup is a skippable home card, with buyer/seller/browse choices in a phone-scoped sheet. Buyer setup uses the live budget/location/transmission/body filters; do not infer family suitability or low running costs from body type. Preferences and unfinished setup persist on this device; confirmed filters stay separate from unfinished edits. Reopen from Hesabım → Başlangıç tercihlerim. Setup never enables notifications or requires sign-in to browse.
- `marketplace-guidance.ts` explains actual listing fields against the active search. Show budget headroom and exact matches, disclose unmet preferences in details, and label condition matches as seller declarations. Never treat unknown condition as boyasız/değişensiz. Seller setup opens the existing editor; its checklist and next-photo action guide completion. The home resume card restores only this tab's temporary vehicle details; unsaved photo files must be selected again.
- The user combined the former Takip and Favoriler navigation into Kaydedilenler, with Araçlar and Aramalar views. Keep the bottom navigation Keşfet / Kaydedilenler / Hesabım and preserve both account-backed collections; saved searches do not imply active monitoring or notifications.
- The user authorized real sign-in, listing creation/publication, photo upload and cross-user browsing. `CloudMarketplace.tsx` is now the default marketplace; `Marketplace.tsx` and the fictional listing remain a separate example experience (`?demo=1` or Hesabım → Örnek deneyimi incele). Earlier prototype-only statements below describe that example experience.
- `supabase.ts` uses only a publishable key; `marketplace-api.ts` calls the real Supabase project. Auth email/password, draft → published → archived listings, catalog pickers, private photo storage, favorites and saved searches are connected. SMTP/domain configuration is still required for public email verification and reset delivery; never disable email confirmation to hide that dependency.
- Draft data/media is owner-only. Public listing responses omit account and contact information. Seller-provided condition remains explicitly unverified; unknown condition must not match boyasız/değişensiz filters.
- Publication requires all eight photo positions in both the form and the database. Region labels/confirmation guide the seller; there is no automated verification of photo contents. Photos are redrawn as JPEG before upload to remove embedded metadata.
- `supabase/tests/marketplace-policies.sql` tests actual RLS in a rolled-back transaction. `tests/cloud-marketplace.spec.ts` tests iPhone/Android UI with simulated HTTP responses; do not describe those as live Auth/Storage verification. `marketplace-live.test.mjs` is opt-in and requires two working, disposable test accounts created through supported Supabase Auth tooling.
- Keep the app-owned form pointer-down focus guard: allowing blur to close the simulated keyboard before click can move the submit button and swallow the first tap.

## Sattım Gitti design decisions

- The user selected generated visual option 1: white Uber-inspired UI, large silver SUV, restrained amber findings, minimal icons and short Turkish labels.
- Visual source: `qa/design-reference.png`. App UI lives in `src/Prototype.tsx` and `src/prototype.css`.
- This deliverable is a browser-based mobile interaction prototype with iPhone and Pixel previews. It is not an Expo/native app build.
- Preserve the app-level device-shell scroll guard: portalled modal autofocus must not shift status bars and keyboard assets into view.
- The user wants comprehensive marketplace listing information while retaining the selected white design. Show price/model/location first, four compact icon-led key facts, then expandable technical, equipment, history and seller sections. Keep the vehicle photo and existing upload flow.
- `src/listing-data.ts` contains explicitly fictional listing data. Catalogue specifications must remain distinct from unverified seller/vehicle information; missing history must never become a positive condition claim.

## Marketplace UI decisions

- Keep interactions restrained and fluid: immediate press feedback, short content entrances and a moving bottom-navigation selection. Respect reduced motion in app content and portalled sheets; never delay navigation, animate device chrome, or interfere with drag suppression and keyboard focus guards.

- Display connected marketplace listings as compact horizontal cards, with key vehicle facts and small pill-shaped seller-declared condition labels beside the photo.

- The user wants guidance from listing through sale and handover, including messaging, appointments, expertise, price offers, safe payment preparation, notary, insurance and MTV. `sales-journey.ts` defines the nine steps and dependencies; app-owned journey UI is in `Prototype.tsx`. Entry points are the example listing, Takip, Keşfet and Araç sat (seller role).
- Buyer and seller progress/drafts persist separately in this browser for the fictional listing. Saved messages, appointments, expertise notes and offers are personal drafts: no sending, reservations, counterparty acceptance, policy issuance, bank payments or official notary verification may be implied. MTV links to the official GİB site. Step completion is the user's own declaration. Policy/borç/payment/document confirmations precede the notary confirmation; handover follows notary. Removing a prerequisite cascades; changing the saved offer reopens payment/notary/handover confirmations.
- Keep source links beside the insurance, MTV and payment guidance, without inventing debt balances, premiums, tariffs or official transaction status. Ordinary second-hand traffic insurance is prepared before notary. Real provider integrations remain separate work.

- The user set the core promise: “Sen arama, biz senin için takip edelim.” Use it as the Keşfet headline, with supporting copy about setting needs/budget once and saving a followed search. Keep the compact last-search reminder and needs shortcuts. Show the prototype's disconnected live tracking near the promise; saving a search must not imply a live monitor or real notifications are active.
- The user rejected the first promise treatment as visually weak. Keep the promise compact: a prominent “Sen arama,” line and smaller supporting line, short supporting copy, one grouped search surface with filter/search actions side by side, and three complete bordered need cards. Preserve the white/black palette and keep the live-tracking limitation legible inside the search surface. Scope this home composition separately from results and other tabs.
- The user supplied a notification-writing example: explain which vehicle matches with year, transmission, mileage, budget headroom when a budget exists, and why the saved criteria match. `src/search-data.ts` shares the matcher between results and notification previews. Keep previews explicitly fictional; do not turn unknown condition/history into a match claim. Without followed searches, the preview uses a labelled sample search; with followed searches, only matching criteria may produce a preview. Keep the white UI despite the reference image's black document background.
- The user wants a single simple journey from need-led discovery to decision support and tracking. The three home shortcuts are Aile arabası, Büyük bagaj and Düşük maliyet; the category criteria are visible and are saved with followed searches. The user selected fuel + maintenance for the initial cost estimate; tax and insurance are excluded and the assumptions must be visible.
- `src/decision-data.ts` contains explicitly fictional comparison and need-matching inputs; `src/Prototype.tsx` compares the demo listing against a fictional second scenario, estimates usage costs, and exposes missing price-history/market data without inventing a verdict. Those numbers are not verified Jeep specifications or live fuel prices. Actual listing and market integrations remain unimplemented.
- Takip groups followed searches, the example favorite's price information, update status and notification preferences. Live updates and notifications remain disconnected; never fabricate historical prices, alerts, market valuations or favorable vehicle condition claims.
- The decision sheet caps its height to the available space above the simulated keyboard. The outer app's pointer-down guard must only handle DOM descendants of the app root: React events from portalled sheets still bubble through it, and preventing their default there can make Radix treat an inside tap as outside. Preserve the sheet's own focus handling.
- The user approved the 28 October screenshot's written design decisions: white surfaces, black text, light gray areas, one prominent black search/continue action, 14–20px surface radii, search + three shortcuts + resume search, bottom-sheet filters, large listing photos with clear price/short facts, and four tabs: Keşfet / Takip / Favoriler / Hesabım. Keep an Araç sat entry at the upper right.
- `src/Marketplace.tsx` owns the search, filter draft, results, followed searches, favorites/account views and notification preferences. `Prototype.tsx` owns the shared header/navigation, listing detail and photo sheets. Keep marketplace state mounted while opening the listing.
- Search currently filters only the fictional Jeep listing. Do not suggest live marketplace results, published listings, real authentication or real notifications. Araç sat connects to photo preparation; publication remains unconnected.
- Empty results explain which applied criteria prevent a match, including the 1 million ₺ budget option. Show the example price and budget gap, list every required change, and apply them only on tap. A recovery action must pass the same listing matcher before promising an example result; retain criteria that already match.
- Last executed search, followed search criteria, notification choices and the example favorite persist in localStorage on this browser. Listing photos remain session-only. Notifications default off and no OS permission is requested.
- Show the last search as a small tappable notification-style reminder at the top of Keşfet rather than a large returning-user screen. Tapping it restores all saved criteria; keep the search form and need shortcuts prominent. A matching static example is labeled as such, and missing live new-match data must not be presented as a verified update.
- Filter changes remain drafts until Sonuçları göster; dismissing the sheet discards pending changes. MobileScroll already subtracts keyboard height: app-owned marketplace bounds reserve only navigation/safe areas, avoiding double keyboard subtraction. Preserve the app-owned focus handling so a blur cannot move a button during its tap.

## Photo upload and branch scope

- The user explicitly approved merging the HD original-photo tour and optional local 3D workflow into main on 17 November 2026. Preserve the connected marketplace, Android runtime, ordinary region photos, accounts and publication flow. Tour drafts remain local and separate from published listing photos.
- Photo selection, validation, preview and removal live in `Prototype.tsx`. JPG/PNG/WebP; 12 MB per file, maximum 8 files. Photos remain in session memory and are not sent to a server by this flow. Do not imply a pending automatic analysis.
- Existing git-ignored source scans and compiled tools remain private. HD tour drafts use the local IndexedDB scan store. Only explicit optional 3D generation sends a scan to the loopback reconstruction worker; static hosting does not deploy that worker.

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.

## Original-photo tour decisions

- The user approved original-photo HD orbit tours as the primary presentation after comparing the Togg configurator. Free-orbit reconstructed 3D remains an optional additional view; it must never replace original evidence photos.
- `VehicleTour.tsx` displays original local capture URLs without synthesis, interpolation, resizing or background replacement. Group by capture height, then direction, preserving within-direction capture order. Keep these personal draft photos separate from the fictional marketplace listing.
- The first pass (8 directions × 6 distinct photos = 48) unlocks the planned HD 360° tour without a reconstruction service or the other two passes. Partial collections remain viewable as “Fotoğraf önizlemesi”; stop at endpoints rather than looping over missing sections. Direction counts are capture-plan completion, not measured geometric coverage.
- Retain original downloads, bounded adjacent-frame preloading, keyboard/frame controls, detail zoom and visible image-load recovery. Do not preload an entire scan into decoded image memory. The complete 144-photo policy remains required for optional 3D generation.
- Old real-car dataset frames can be used only in git-ignored QA previews, with estimated direction/height grouping clearly disclosed. Their changing camera distance and framing must not be presented as a newly validated smooth 48-frame capture.

## Guided capture decisions

- The user clarified that their own photographed vehicle must be reconstructed. A generic mesh does not fulfill that outcome. `CaptureFlow.tsx` and `CaptureCamera.tsx` implement guided camera/gallery capture in the approved white UI.
- Three passes (normal/high/low), eight directions and six sequential photos per section is a 144-photo capture plan; do not imply the app measures geometric overlap or guarantees model quality. Quality warnings are advisory.
- `capture-policy.ts` is shared by client/server. JPG/PNG, minimum 1600 × 900 px, 12 MB/photo, 160 photos and 512 MB/session. Identical files cannot fill different angles.
- Scan drafts persist locally until deleted. No third-party photo upload. Local server copies expire at 24 hours; see `server/README.md` for sweep timing and operational constraints.
- `server/reconstruction.mjs` binds loopback 4180, accepts only the preview origin and invokes actual Apple Object Capture (`server/native/Reconstruct.swift`). OBJ/dokular convert to embedded GLB with Cesium obj2gltf. `.local/` contains private scans and compiled binaries and must remain outside git.
- Ready/failed/progress must come from real jobs; never simulate successful reconstruction. User models never inherit sample annotations. The user rejected the low model quality: native output now uses custom detail (250k polygon / 8K texture ceilings, actual output depends on source) with bounded 4K/JPEG mobile delivery, rather than reduced. Photo-baked unlit colours must not receive a second filmic tone map. Supported browsers prefer ImageCapture stills; physical camera QA remains outstanding.
- An optional **Gerçekçi görünüm hazırla** step learns Gaussian appearance locally with Brush from photo-estimated poses/intrinsics and sparse points (macOS 26); it is separate from the immediately usable GLB. Keep real job status, preserve the geometry on training failure, stop both jobs on scan deletion, and retain the same privacy/retention rules. `VehicleAppearance.tsx` uses lazily loaded Spark with on-demand drawing; user models have no sample findings. Frame and filter against actual mesh surfaces, not Object Capture's padded capture volume. Never imply image quality proves damage or paint accuracy.
- Gaussian training must use foreground alpha masks projected from the actual reconstructed mesh into each calibrated photo (`RenderMasks.swift`). Training on the full background caused ghosting and ground streaks; post-cropping alone did not fix it. Keep original photos intact, rescale camera intrinsics with training images, and preserve GLB fallback. Initial framing must account for perspective depth rather than guessing a fixed camera distance.
- The 128-photo real Volkswagen comparison and Gaussian run are documented in `qa/real-car-test.md`. Surface/measurement/damage accuracy and the physical guided camera flow are not certified. Source photos/models and screenshots stay under git-ignored `.local/real-car-test/`, not shipped app assets. Remaining reflective-window and ground artifacts must be reported honestly; do not replace them with generated car imagery.
- Both geometry and Gaussian viewers fit actual model bounds for reset, top view and viewport changes; fixed camera distances must not clip portrait or wide-body models.
- If optional Gaussian download or validation fails, open the validated GLB and show a visible explanation. Geometry download/validation failures remain errors; never substitute a demo.
- This is a local development pipeline, not a public multi-user service. Static hosting does not deploy the Node/Swift worker. Native iOS/Android apps and production infrastructure remain separate work.
