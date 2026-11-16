# Design QA — Sattım Gitti

Current revision: need-led discovery, decision support and tracking (29 October 2026), documented below. Earlier prototype/listing/3D findings are comparison history; their limitations describe those earlier revisions.

Source visual truth: `qa/design-reference.png`, selected option 1, original 853 × 1844 pixels.
Implementation: `qa/iphone-final.png`, 393 × 852 pixels. Browser viewport 1400 × 1200, device screen verified at 393 × 852 CSS pixels, density 1. Android evidence: `qa/android-final.png`, 427 × 952 CSS/pixel dimensions, density 1.
State: initial white vehicle screen, perspective view, no added photos, default example finding.
Full-view comparisons: `qa/comparison-initial.png` and `qa/comparison-final.png`; source proportionally downsampled to 393 × 849 and compared at the same width. Focused comparisons: `qa/comparison-hero.png` and `qa/comparison-footer.png`, reviewed for image, control, label and typography fidelity. Template-owned status bar, bezel and home indicator are expected additions. No source image stretching.

## Initial findings

- [P2] View hint aligned left instead of centered under vehicle. Fix: center hint independently of the right-aligned view switch.
- [P2] Finding row had insufficient clearance from the fixed footer. Fix: shorten the hero stage by 40px; preserve the fixed CTA/navigation and safe areas.
- [P2] Portalled modal autofocus could programmatically scroll the outer device screen, clipping the heading/status bar and exposing the hidden keyboard asset. Fix: keep the app's outer device shell at scroll position zero while allowing the sheet's own content to scroll. Post-fix upload, modal open/close and device switching verified at outer scroll position zero.
- [P3] The generated hero uses a slightly different perspective from the mock; the vehicle subject, silver finish and studio treatment are preserved.

## Intentional prototype behavior

The view toggle switches between generated perspective and overhead images. It is not a freely rotating 3D model. The UI says “Görsel önizleme” and “Örnek araç”. Findings and evidence are explicitly fictional examples. Added photos stay in session memory and do not generate findings. Real AI analysis, 3D reconstruction and native app binaries are not included.

## Required fidelity surfaces

- Typography: local Inter Variable, bold single-line title, compact wordmark, subdued supporting copy.
- Spacing: 20px content inset, large vehicle hero, centered hint and right-aligned view switch, fixed primary action and navigation. Final captures confirm visible finding labels and clearance above the CTA. Extra whitespace on taller Android is intentional. Hero image can bleed into horizontal margins; all visible controls remain within the screen bounds.
- Colors: white base, near-black type and primary CTA, gray secondary labels, restrained amber for unverified sample finding.
- Images: generated full-resolution vehicle and evidence assets, consistent silver vehicle, no UI screenshot used as app background.
- Copy: Turkish; “3D önizleme” changed to “Görsel önizleme” and “Döndür” changed to “Örnek araç” to accurately reflect current interaction.

## Comparison history

1. Initial browser capture and combined comparison found two layout P2 issues. Adjusted hint centering and hero height.
2. Upload interaction evidence revealed the modal autofocus P2 issue. Added the app-level outer-scroll guard; repeated photo selection, sheet transitions and device changes. The outer screen remained at `scrollTop: 0`.
3. Re-captured final iPhone screen and combined full/focused comparisons. No actionable P0/P1/P2 visual differences remain. Generated vehicle perspective and the closest Phosphor icons are P3 differences. The overhead view retains 44px hit areas while its narrow marker stays on the door panel.

## Browser verification

- iPhone and Pixel 10 preview switching, perspective/overhead image switching, all primary controls reachable.
- Door sample finding opens its fictional evidence; hood opens the distinct “İncelenmedi” state.
- Multiple photo selection, image decoding, count updates and photo removal.
- Rejected unsupported file type, corrupted image and file over 12 MB; existing accepted photos preserved.
- Attempting to exceed 8 photos accepts only remaining capacity, explains the limit and disables additional selection.
- Photo selection does not create or overwrite sample findings; added photos show “Analiz bekliyor”.
- Favorites update the account sheet; exploration opens and returns to the vehicle; Escape and close controls dismiss sheets.
- Tested upload and removal on Pixel as well as iPhone. Captures: `qa/iphone-photos.png`, `qa/android-photos.png`, `qa/iphone-top.png`, `qa/android-top.png`, `qa/iphone-evidence.png`.
- Fresh-load browser console: no warnings or errors. Transient Vite dependency hot-reload errors during initial package installation resolved on reload and did not recur.
- Final `npm run build`: passed, including TypeScript compilation, Vite build and the 28-file protected runtime integrity check.

## Implementation checklist

- [x] Preserve protected mobile runtime and both device presets.
- [x] Recreate selected white design using generated local assets, bundled fonts and library icons.
- [x] Make primary interactions work without fabricating analysis.
- [x] Fix identified P2 issues and compare final browser-rendered evidence.

## Follow-up polish and limits

- [P3] Generated hero camera angle and individual library icon silhouettes differ slightly from the mock.
- A native iOS/Android build, freely rotating mesh and actual AI analysis remain future implementation work. Browser device previews do not verify native-device behavior.
- No deployment or publication was performed.

## Listing-information extension — 28 October 2026

User-authorized scope: preserve the selected white visual language and vehicle interactions, while adding comprehensive used-car listing information. Replacing the generic heading with model/version/price and moving the sample finding below the four key facts are intentional hierarchy changes.

### Visual evidence and normalization

- Existing app baseline: `qa/listing-before.png` (Pixel 10, 427 × 952 pixels).
- Updated initial screens: `qa/listing-android.png` (427 × 952), `qa/listing-iphone.png` (393 × 852).
- Browser viewport: 1400 × 1200; device-scale factor 1; exact CSS/pixel dimensions verified. Device chrome is template-owned and preserved.
- Combined before/after comparison: `qa/listing-comparison.png`, equal 427 × 952 regions without stretching. Reviewed original and updated vehicle imagery, heading/price hierarchy, key facts, toolbar and persistent CTA/navigation together.
- Focused content evidence: `qa/listing-sections-iphone.png`, `qa/listing-technical-iphone.png`, `qa/listing-equipment-android.png`. New detail sections have no earlier visual equivalent; evaluated against the user's requested content and existing font, icon, spacing and separator system.

### Required fidelity surfaces

- Typography: retained locally bundled Inter; 34px model heading, 28px price, compact 14px key values, 15px section names, readable technical/equipment/description text. Raised supporting-label contrast and detail text size after the initial implementation.
- Spacing/layout: retained header/footer and safe areas; four icon-led key facts remain visible in the first iPhone viewport. Detail sections use the existing vertical scroller and can all be reached above the fixed footer. No field clips horizontally; outer device scroll remains zero.
- Colors: retained white/near-black/gray language and amber unverified sample finding. Missing history uses neutral text rather than success styling.
- Images: retained the generated silver SUV and overhead assets. The first extension comparison made the perspective vehicle too small; corrected only its surrounding white studio crop to restore prominence. Final combined comparison confirms the full vehicle remains visible. The overhead view keeps `object-fit: contain`.
- Copy/content: fictional listing is visibly labelled; no live-marketplace integration or current price claim. Catalogue engine data is distinct from unverified example mileage, options and seller statements. Missing paint/damage/maintenance data remains missing.

### Interaction checks

- Technical accordion expands/collapses and exposes engine, transmission, drive, body, color and vehicle state rows.
- Equipment accordion and all three categories (Konfor, Güvenlik, Teknoloji) show the corresponding items.
- History accordion distinguishes missing report, pending record, unknown accident state and unspecified maintenance/inspection/warranty.
- Example-finding action in history opens the existing evidence sheet and closes back to the listing.
- Listing/seller accordion exposes listing date/ID, location, seller type, swap/nationality fields and seller description.
- iPhone vertical scrolling reaches the final section; source labels remain reachable. Existing photo sheet opens/closes from the expanded listing.
- Pixel and iPhone initial renders checked; no horizontally clipped listing fields. Outer device `scrollTop: 0` after modal transitions.
- Clean final-load browser console: no errors or warnings.
- Final `npm run build`: passed, including TypeScript and all 28 protected runtime files.

### Remaining P3 notes

- Production build emits a non-blocking chunk-size warning (about 529 kB minified / 163 kB gzip). Icon/module chunking is a production follow-up; limits were not weakened to hide it.
- The preview remains a browser prototype with fictional listing data; real marketplace integration, native builds, AI analysis and mesh-based 3D remain outside this extension.

No actionable P0/P1/P2 findings remain in this revision.


## Real 3D viewer extension — 28 October 2026

User-authorized scope: add a real, freely rotating mesh viewer to the approved white listing UI. The existing photographic hero and listing information remain the entry point. A clearly labelled general SUV demo is used; it is not the exact Jeep in the fictional listing and was not reconstructed from its photos.

### Visual evidence and comparison

- iPhone: `qa/model-iphone.png`, 393 × 852 pixels. Pixel 10: `qa/model-android.png`, 427 × 952 pixels. Browser viewport 1400 × 1200, density 1.
- `qa/model-comparison.png` compares the approved listing baseline and the new viewer at equal 393 × 852 dimensions. The new modal has no one-to-one source counterpart; reviewed against the approved white, Inter, restrained gray/amber and icon-led control system.
- `qa/model-listing-android.png` records the preserved listing with its new 3D entry button. `qa/model-top.png` and `qa/model-import.png` document top view and an imported local model. `qa/model-preview.png` is a proportional delivery preview.
- Full model is visible at the default camera position. Controls retain 44px targets; text and file actions fit both device screens. Final Pixel outer screen: client width 427, scroll width 427, scrollTop 0. One active canvas while open.
- Source labels distinguish the general demo from local models. User-imported models have no invented part markers. Unverified sample findings retain amber and explicit sample copy.

### Iteration and fixes

- Adjusted camera distance and lighting after initial screenshots so the full SUV is comfortably framed.
- Replaced the removed Three.js soft shadow setting with the supported PCF setting. Fresh final-load console: no warnings or errors.
- Added explicit hidden-marker styling so far-side sample annotations do not remain visible because of their grid display rule.
- Reused the app-level outer-scroll guard and existing evidence sheet; sample findings opened from 3D have a dedicated return-to-model action.

### Verified interactions and validation

- Real mesh rendered on iPhone and Pixel browser previews. Button rotation changed actual camera azimuth (0.729 to 0.206); zoom changed camera distance (6.628 to 5.303 in the initial camera configuration).
- Canvas drag changed azimuth from 0.728 to -2.481. Keyboard rotation and top/reset controls worked. Final default camera distance is 5.194.
- Door annotation opens fictional scratch evidence; hood opens the distinct unexamined state. Return-to-model recreates the viewer successfully.
- Invalid local GLB is rejected with a useful Turkish error while the valid demo remains available.
- Local self-contained GLB opens through the file picker, shows its filename, enables real controls and hides demo-only annotations. Returning to the demo restores its annotations.
- Closing the viewer removes its canvas (count 0); reopening creates one canvas again. Repeated model/detail/import transitions succeeded. Code disposes scene resources, renderer, controls and resize observer; requests are aborted on unmount.
- GLB validation limits file size to 20 MB, rejects malformed headers/collections, external resource references and excessive model complexity. Files are parsed locally without uploading them.
- `node --test tests/model-file.test.ts`: all 5 tests passed, including the shipped asset, truncation, remote resources, size/complexity and malformed collections.
- Final `npm run build`: TypeScript, Vite and all 28 protected-runtime integrity checks passed.

### Remaining notes and scope

- [P3] Production chunk-size warnings remain: main JS approximately 531 kB / 164 kB gzip; lazy 3D chunk approximately 650 kB / 163 kB gzip. The 3D code loads when its sheet is opened, renders on demand and caps device pixel ratio. Build warning limits were not weakened.
- The bundled Kenney SUV is a stylized CC0 demonstration mesh. Attribution and source details are in `public/assets/models/README.md`. It intentionally differs from the generated silver listing photos.
- Pinch is supported by OrbitControls but was not exercised on physical multitouch hardware. Browser device presets do not constitute native iOS/Android certification.
- Local files must be self-contained GLB 2.0; external textures and decoder-dependent compressed models are not part of this implementation.
- Photo-to-3D reconstruction, automatic paint/damage inference, marketplace integration and native app binaries remain unimplemented. Importing a model does not map parts or produce findings.

No actionable P0/P1/P2 findings remain in this revision.

## Guided capture and local reconstruction — 28 October 2026

Scope: preserve the approved white app and add the user's requested photograph-to-model journey. The main CTA now opens guided capture. A real local Node/Swift reconstruction pipeline is connected. This report passes the implemented UI and tested contracts; it does not certify real-car reconstruction fidelity or production readiness.

### Evidence and comparison

- Original visual truth remains `qa/design-reference.png`. Existing approved modal baseline: `qa/model-iphone.png`, 393 × 852 pixels.
- Current iPhone: `qa/scan-intro-iphone.png`, `qa/scan-capture-iphone.png`, `qa/scan-review-iphone.png`, each 393 × 852. Pixel: `qa/scan-intro-android-final.png` and `qa/scan-capture-android.png`, each 427 × 952. Main listing: `qa/scan-listing-android.png`.
- Browser test viewport 1400 × 1200, DPR 1. Actual CSS screen dimensions were verified at 393 × 852 and 427 × 952. Phone screen crops exclude the surrounding canvas. Device preset resets to iPhone on reload; the final Android capture was reselected and dimensions checked before capture.
- `qa/scan-comparison.png` combines the prior approved modal, new introduction and new capture view at equal 393 × 852 dimensions. These are intentionally different product states, not a one-to-one image recreation. `qa/scan-header-comparison.png` aligns the sheet origins before comparing titles, close button, margins and type. Prior sheet origin was y=182; scan introduction y=91 in its reference capture. Taller content changes sheet height intentionally.
- `qa/scan-preview.png` is a proportional 280 × 607 delivery preview. Existing silver vehicle imagery is reused as a capture guide, not represented as a reconstruction from new photos.

### Findings and iteration

- [P2, fixed] Review inherited the capture sheet's scroll position. Its heading and first direction row were clipped even though the persistent sheet header was visible. Added app-owned scroll reset on step/direction/pass changes. Recaptured `qa/scan-review-iphone.png`: review heading is visible, inner scrollTop 0; footer content remains scrollable. The protected runtime was untouched.
- A development dependency refresh reset the early panel once. After clean reload it did not recur. Final-load browser console contained no warnings or errors.
- No actionable P0/P1/P2 visual findings remain. The browser capture pipeline produces slight raster softness in some final screenshots; measured CSS dimensions, DPR and screen transform are correct (1:1, DPR 1, no filter/transform). Earlier capture-state evidence remains readable and the app uses native text, not rasterized UI.

### Required fidelity surfaces

- Typography: retained bundled Inter, 25px sheet titles, 29px introduction/review headings, compact 11–14px controls/supporting copy. Direction labels wrap within four equal columns without horizontal clipping.
- Spacing/layout: existing sheet/title/close anatomy and radii retained. Capture has two-pass switch, eight directions, selected-direction guide and camera/gallery actions. Minimum 44px actions. Sheet content scrolls above the device navigation region. Final iPhone/Pixel outer scrollTop 0 and scrollWidth equals clientWidth (393/427).
- Color: white, near-black, neutral gray; restrained amber advisory warnings and the existing red validation error treatment. Missing directions never receive completed styling.
- Images/icons: existing generated silver top-view guide and Phosphor icons. No handcrafted vehicle illustration or screenshot-as-UI. Preview thumbnail uses an explicitly generated test image and was removed after testing.
- Copy: distinguishes planned capture completion from measured geometric coverage. Explains local browser retention, transfer to this Mac, server expiry, real processing variability, and absence of automatic damage/paint analysis. Product text does not expose implementation details needed only by developers.

### Browser interactions

- Introduction → capture → review and return to a missing pass; direction and pass selection update instructions/counts.
- Valid 1619 × 971 test image accepted in the selected front direction, progress 1/64.
- Repeated same image and lower-resolution top image rejected with distinct useful messages; accepted image/count preserved.
- Missing capture keeps generation disabled, including after checking the user's photo-review confirmation.
- Review shows the live local-service health response. No processing success is simulated.
- Actual reload restored the IndexedDB draft and front image/count. Closing/reopening and device switching preserved the draft. Two-stage delete did not remove photos on its first click; confirmation removed only the test draft. A later reload confirmed no remaining test photos.
- Existing listing and real 3D demo still open; orbit/zoom controls enabled. Import/reconstruction code paths keep demo annotations off user models.
- Native browser camera permission was not granted during QA. Physical capture, fallback behavior on hardware and actual rear-camera resolution remain device-test gaps. Code stops tracks on close/background and offers the file-picker fallback.

### Build and pipeline verification

- `npm run build`: passed, TypeScript/Vite and all 28 protected runtime checks.
- `npm run test:reconstruction`: 12 tests passed. Covers shared capture rules, GLB rules, rejected origins/hardware, incomplete/duplicate uploads, temporary-file cleanup, test-engine OBJ→GLB conversion, cancellation, concurrent-job rejection and worker failure without ready state.
- Actual Swift worker compiled; hardware probe passed outside the restricted tool sandbox. Actual empty-input request returned invalidImages and no model. The loopback reconstruction service is running on port 4180.
- Controlled API conversion tests use a fixture motor, not real vehicle photographs. No full photographed-car reconstruction was claimed or measured.
- [P3] Build retains chunk-size warnings: main approximately 557 kB / 172 kB gzip; lazy Three.js viewer approximately 649 kB / 163 kB gzip. Warning thresholds unchanged. Further chunking is a production follow-up.

### Scope and remaining work

- Real automobile photo-set reconstruction, reflective glass/paint fidelity, geometric accuracy and processing performance need empirical testing. Minimum 64 frames and simple light/sharpness checks cannot establish those properties.
- This pipeline runs on the same Mac. A phone-accessible production service still needs HTTPS, identity/data isolation, remote queue/worker operations and physical iOS/Android validation. No native binaries or public deployment were produced.
- Store/server limits and retention behavior are documented in `server/README.md`; the app distinguishes the ordinary session-only listing photos from persistent scan drafts. Auto damage, paint and replaced-panel inference remain unimplemented.

Implementation checklist: preserve runtime [x]; guided capture and recovery [x]; real local job integration [x]; validation/cancellation tests [x]; screenshot comparison and scroll fix [x]; real-car and physical-device quality evaluation [pending].

## Search-first marketplace UI — 29 October 2026

### Source and comparison evidence

- New source: `qa/marketplace-ui-decisions.png`, the user's 720 × 1600 screenshot containing written UI decisions. The user explicitly approved applying these decisions. This is a specification screenshot, not an app mock to reproduce pixel for pixel. Its dark chat chrome is not an instruction to make the app dark.
- Retained visual baseline: `qa/design-reference.png`, the previously approved white vehicle treatment and existing generated vehicle assets. New screens intentionally extend that baseline.
- iPhone final evidence: `qa/marketplace-home-iphone.png`, `qa/marketplace-results-iphone.png`, `qa/marketplace-filters-iphone.png`, each 393 × 852 pixels. Browser viewport 1400 × 1200; phone CSS bounds verified at 393 × 852, density 1; outer scrollTop 0 and scrollWidth 393.
- Pixel evidence: `qa/marketplace-home-android.png`, `qa/marketplace-results-android.png`, `qa/marketplace-filters-android.png`, `qa/marketplace-keyboard-android.png`, each 427 × 952 pixels. CSS bounds verified at 427 × 952, density 1; outer scrollTop 0 and scrollWidth 427. The keyboard capture predates the compact results-heading refinement.
- Additional states: `qa/marketplace-keyboard-iphone.png`, `qa/marketplace-tracking-iphone.png`, `qa/marketplace-listing-iphone.png`, `qa/marketplace-model-iphone.png`.
- Full comparison: `qa/marketplace-comparison.png` places the specification alongside home, results and filter captures. Source is proportionally reduced to 852px high; implementation captures remain at native dimensions. Different states are intentional, and no pixel-match claim is made for the written source.
- Focused comparison: `qa/marketplace-focused.png` places the source table alongside the final listing card/price/facts region. `qa/marketplace-preview.png` is a 900 × 633 delivery montage, not native-size verification evidence.

### Findings and iterations

- [P1, fixed] The first keyboard check exposed double subtraction of keyboard height: app-owned section bounds used bottomInset while MobileScroll also subtracted keyboard height, collapsing the visible search region. Fix: reserve only navigation/safe-area height in the marketplace section; let MobileScroll handle the keyboard. New iPhone and Pixel captures show the input and search action above the keyboard. Search click now submits and hides the keyboard on both devices.
- [P2, fixed] Blurring a focused input could move a keyboard-attached navigation button before its click. App-owned pointer-down handling now preserves focus until the action, while input blur still dismisses the keyboard. Verified one-click transition from focused Android search to Favoriler; keyboard state becomes false and the favorite screen appears.
- [P2, fixed] Early app-owned clear/remove/back controls used widths below 44px. Updated these targets and filter chips to at least 44px. Selected/deselected labels and keyboard focus outlines remain present.
- [P3, refined] Results originally repeated the full home introduction and pushed the price below the initial view. The final compact results heading exposes the photo, price, model and short facts together on iPhone. Longer content and the location remain vertically scrollable above fixed navigation.
- Repeated final source/implementation comparison found no remaining actionable P0/P1/P2 issues. Transparent pointer circles visible in some captures belong to the protected preview cursor.

### Required fidelity surfaces

- Typography: retained bundled Inter; home 35px heading, compact result heading 28px, 24px card price, 15px model, concise 10–13px supporting content. Turkish text wraps within phone width; hierarchy separates price/model/facts. The source is written requirements and does not prescribe an exact font.
- Layout: 20px page sides, consistent 10–24px gaps, 14–20px main surface radii, three equal shortcut columns and four persistent navigation items. Filter choices appear in a phone-scoped bottom sheet. Home's resume card appears only after an actual search; initial home and returning-home states differ intentionally.
- Colors: white, near-black and neutral light gray match the source decisions. Selected filters and the primary search/continue action are black. Existing amber sample findings remain confined to the vehicle-detail flow.
- Assets: retained existing generated silver SUV photos, with Phosphor icons for actions. No fabricated new car photos, CSS vehicle drawings, rasterized UI or new device chrome. The generic 3D demo retains its explicit identity.
- Copy: actual tab labels are Keşfet / Takip / Favoriler / Hesabım; Araç sat remains at upper right in each main screen and detail. Fictional listing labels and unconnected publication/notification states are explicit. Followed-search criteria are distinct from live alerts.

### Browser verification

- Home → search with Jeep → one example match; nonmatching keyword and sub-price budget → empty state; reset and chip removal → matching example restored.
- Filter draft selection + dismiss + reopen restored the previously applied selection, not the discarded draft. Apply changes updates filter count and results.
- SUV shortcut runs a body-type search; automatic-transmission and budget shortcuts are connected to the corresponding criteria/panel.
- Follow → Takip shows the actual executed search; opening it restores its criteria. Removal reaches the empty state.
- Favorite → Favoriler → reload preserves the example listing. Removing the favorite shows its empty state. Test favorites and follow entries were removed after verification.
- Reload restores the last executed search and exposes Aramana devam et. Opening the saved search runs it again. Notification choice survived reload; test toggle was restored to off. No OS notification permission was requested.
- Hesabım links to favorites, followed searches, scan, ordinary listing photos and notification choices.
- Listing opens from a card, preserves the comprehensive existing detail, and returns to its originating screen. 3D demo loads and zoom remains enabled. Araç sat opens photo preparation and existing guided capture without pretending to publish an advertisement.
- iPhone/Pixel keyboard search controls remain visible. Input blur, search submit, filter presentation and tab changes dismiss the simulated keyboard. Outer device shell remains fixed.
- Final browser console check: no errors or warnings. Header/navigation remain reachable; no horizontal overflow on either device.

### Validation and scope

- Final `npm run build`: passed, including TypeScript, Vite and all 28 protected runtime hashes.
- `npm run test:reconstruction`: all 12 tests passed. The sandbox initially prevented loopback test-server binding; the same test command passed with the approved environment permission. Capture/model/server implementations were not changed.
- Existing chunk-size warning remains a P3 production follow-up (main about 589kB minified; lazy 3D about 648kB). Limits were not weakened.
- Last search, followed searches, notification choices and the example favorite persist in localStorage in this browser. Plain listing photos remain session-only; scan drafts retain their existing IndexedDB behavior. Storage-unavailable states are surfaced.
- This remains a browser prototype with one fictional listing. Live marketplace search, listing publication, real notifications, authentication and native store builds are not implemented. Existing photo-to-3D quality and physical-device limitations remain as documented above.

Implementation checklist: search-first home [x]; draft bottom-sheet filters [x]; four tabs and local recovery [x]; persistent selling entry [x]; preserved listing/3D/capture flows [x]; keyboard and both device presets [x]; final visual comparison and build [x].

## Need-led discovery and decision support — 29 October 2026

Source: the user's written direction in this chat, retaining the prior approved white marketplace visual system (`qa/marketplace-home-iphone.png`). The request describes behavior rather than a pixel-accurate mock, so the new screens are an extension rather than a 1:1 recreation.

Evidence: `qa/needs-home-iphone.png`, `qa/needs-compare-iphone.png`, `qa/needs-cost-iphone.png`, `qa/needs-price-iphone.png`, `qa/needs-keyboard-iphone.png` at 393 × 852 pixels, and `qa/needs-results-android.png`, `qa/needs-tracking-android.png`, `qa/needs-keyboard-android.png` at 427 × 952. Browser viewport was 1400 × 1200 at density 1; phone dimensions and zero outer scroll were verified. `qa/needs-comparison.png` combines the prior home with the new home, comparison, and Android tracking view. The Android panel is proportionally fitted into 393 × 852, with no distortion. `qa/needs-focused.png` compares the previous and current home shortcut region. Different saved-search states and added sections are intentional. `qa/needs-preview.png` is a 900 × 633 delivery montage.

Findings and fixes:

- [P1, fixed] The decision sheet initially extended above the device screen when the keyboard opened. The app-owned sheet now caps its height to the available space below the device's safe top, without modifying the protected runtime. Final iPhone and Android keyboard captures show the title and tabs inside the screen.
- [P1, fixed] A portal click while an input was focused was interpreted as an outside click after a tab transition. The app-level pointer guard now applies only to DOM descendants; the portalled decision sheet handles its own pointer focus. After entering a cost and selecting Fiyat bilgisi, both device previews retained the panel and hid the keyboard; the test was repeated after final source organization.
- [P2, fixed] Followed need cards repeated their category as both title and description. They now show the category as title and its criteria beneath it; the saved search retains additional filters and query text.
- No actionable P0/P1/P2 visual issues remained in the inspected states. The price card and listing below the viewport remain reachable by scrolling. The visible pointer circles in screenshots are the existing preview cursor.

Fidelity surfaces: bundled Inter and the existing text hierarchy remain; rounded white/gray surfaces and black primary action preserve the prior design system; the three equal shortcuts now describe user needs; the comparison uses a readable native table and existing icon family; no new raster asset or device chrome was fabricated. Copy distinguishes fictional comparison data from a real Jeep specification and explains missing market and price-history evidence. Live notifications are not represented as active. The user's choice was fuel + maintenance; taxes and insurance are explicitly excluded from the displayed estimate.

Verification: family criteria match both seats and luggage; a large-baggage query returns no match for the example values and removing its chip restores the example listing; the low-cost shortcut shows its assumptions. Following the family query and reloading preserved its need criteria. Price information → favorite → Takip showed the saved search and example price in the same area; test favorites and followed searches were removed afterwards. Comparison's difference-only toggle hides equal rows. Entering 1,200 km, 48 ₺/L and 900 ₺ maintenance produced 5,220 ₺; empty input produced an error rather than zero. Price history and market comparison show missing-data states. Keyboard focus, switching decision tabs, and closing the panel were exercised on iPhone and Pixel. The existing 3D and capture flows remain in place.

Final `npm run build` passed TypeScript, Vite and the integrity check for 28 protected runtime files. `npm run test:decision` passed four tests covering boundaries, missing/nonfinite data and monthly cost calculations. The developer server logged a transient stale-module HMR error while the new component was moved into the app-owned UI file; a fresh preview tab subsequently reported no console warnings or errors. Vite's existing bundle-size warning remains. Real listing data, market prices, price history, alert delivery and native-app validation remain outside this browser prototype.

final result: passed


## Contextual notification preview — 29 October 2026

Source: `qa/notification-writing-reference.png`, the user's written example of a useful vehicle-match notification. This defines message content rather than a dark app theme. The approved white marketplace treatment is retained.

- `src/search-data.ts` shares the existing result matcher with the message builder. A preview includes the example listing's model, year, transmission and mileage, budget headroom only when a finite budget is selected, and the matching search criteria. A failed criterion produces no message. Budget headroom is distinct from a historical price decrease.
- Takip and notification preferences show the same explicitly labelled preview. Without followed searches, a clearly labelled sample search supplies the demonstration. A saved search replaces that scenario; no matching saved search produces an empty state. The preview does not imply a new listing or a sent notification. Notification preferences remain off unless selected; live delivery remains unconnected.
- iPhone and Pixel were inspected in the in-app browser. Evidence: `qa/notification-preview-iphone.png`, `qa/notification-preview-android.png`, `qa/notification-settings-android.png`. These include the surrounding browser/device preview and are not native-resolution phone exports. Text and actions remain within the device and the longer preferences panel scrolls to Tamam.
- Following the family search changed the message to its saved criteria and removed the budget sentence when no budget existed. Opening the example listing from preferences and returning initially reopened preferences; the preview action now closes its panel before navigation. The corrected transition was repeated successfully. The temporary followed search was removed after verification.
- Validation: production build and the integrity check for 28 protected runtime files passed; four notification tests, four existing search-recovery browser tests, and four decision-data tests passed. The browser tests used installed Google Chrome via a temporary config because Playwright's bundled headless browser was absent; no project runtime/config was changed for that workaround. The existing Vite bundle-size warning remains.
- CodeGraph was initialized with the user's explicit approval and synced after the changes. No deployment or real notification delivery was performed.


## Home promise refinement — 29 October 2026

The user rejected the initial promise composition as visually weak. This is a scoped refinement of the existing white marketplace, not a recreation of a new mockup. Visual grounding: `qa/design-reference.png` (approved white/black design language) and `qa/home-refinement-before-android.png` (the rejected home composition).

Evidence: `qa/home-refinement-android.png`, `qa/home-refinement-iphone.png`, and the combined before/after inspection `qa/home-refinement-comparison.png`. Captures include the phone stage at the same 847 × 797 browser viewport; these are scaled in-app previews, not native-resolution phone exports or pixel-fidelity claims. Before/after Android states use the same saved family search, keyboard closed, and top scroll position.

- [P2, fixed] The three-line slogan, long supporting copy, and vertically stacked full-width actions crowded the first screen. The headline now uses a 38px lead and 23px supporting line, short copy, and a grouped search surface with side-by-side actions. All three need cards fit above navigation on both inspected devices; Android also reveals the listing image.
- [P2, fixed] Need icons and labels previously appeared as separate visual fragments. Each is now a complete bordered 90px card with an existing Phosphor icon and its label.
- Final polish increased input/action/card text sizes and the prototype note after the first comparison. Existing Inter, black primary action, white/gray surfaces and 12–20px control radii remain. No new image assets were needed; the existing example SUV image is unchanged. Copy retains the full tracking promise and explicitly states that live tracking is disconnected.
- Interaction checks in the in-app browser: open filters, choose the 1 million budget, submit, inspect the real budget-gap explanation, apply recovery and see the example listing; open and return from listing; type Jeep on iPhone and submit with Enter, verifying that the keyboard closes and results appear. The original family search without query/budget was restored afterward. No search-follow or notification preference was enabled.
- The five fidelity surfaces were reviewed: typography and wrapping, vertical rhythm and alignment, palette/contrast, unchanged source imagery, and concise/accurate copy. The combined full views show the composition change; focused inspection checked the search controls and need-card labels. This is visual refinement QA at the user's current preview scale. No actionable P0/P1/P2 finding remains in these inspected states.
- Production build, TypeScript and the 28-file protected mobile runtime integrity check passed. The existing bundle-size warning remains. No deployment occurred.

final result: passed

## Listing-to-handover guidance — 29 October 2026

The requested end-to-end process now has nine stages: conversation, appointment, expertise, offer, traffic insurance, MTV/debt checks, safe payment preparation, notary and handover/aftercare. The approved white/black marketplace, device chrome, four tabs, 3D and capture entry points remain. The route opens from the listing, Keşfet, Takip and Araç sat; the seller entry selects the seller role. All vehicle identity and progress remain explicitly an example.

Buyer and seller drafts/checklists persist independently in localStorage. Message and expertise notes, appointment plans and offer drafts use keyboard-aware controls with explicit save actions. Date/time validation rejects impossible dates. Saving a draft never implies delivery, booking, counterparty acceptance or institutional verification. The next step and progress are derived from checklist state. Notary confirmation requires the user's policy, debt, payment and document checks; handover requires notary. Undoing a prerequisite cascades, and a changed offer reopens old payment/notary/handover confirmations.

Insurance, MTV and safe-payment guidance includes primary-source links (TSB, GİB, Ticaret Bakanlığı). The MTV action opens the official Digital Tax Office. No balances, premiums, fees or successful official transactions are invented. Real chat, scheduling, insurance, banking and notary integrations remain disconnected.

Visual QA in the in-app browser: iPhone and Pixel 10 overview, next-step scroll action, expanded conversation form and notary prerequisites. The overview was tightened so the primary next-step action fits above navigation on both devices. Evidence: `qa/sales-journey-iphone.png`, `qa/sales-journey-android.png`, `qa/sales-journey-notary-android.png`. These are scaled previews with surrounding browser context.

Validation: production build, TypeScript, integrity check for all 28 protected runtime files, four decision-data tests and all five new sales-journey tests passed. Browser tests used installed Google Chrome through ignored `.local/journey-playwright.config.ts`, because the bundled Playwright browser is absent. The full browser suite passed 20 of 21 checks. The remaining pre-existing BottomSheet exit test clicks the overlay at (8,8), where Chrome reports the document intercepting the pointer; it runs on the separate runtime fixture, which imports only protected runtime files and does not load the app or its CSS. No protected runtime file was changed. The existing Vite bundle-size warning remains. No deployment occurred.


## 29 Ekim — fotoğraf akışını ana branch’te tutma

Kullanıcının isteğiyle 3D modelleme `codex/vehicle-3d-lab` (`32f23bd`) branch’ine ayrıldı. Main üzerinde model/GLB/tarama girişleri ve ilgili istemci/işleyici bağımlılıkları kaldırıldı. Fotoğraf ekleme/silme, ilan bilgileri, arama/takip ve satış rehberi korundu. Önceki 3D ekran ve test kayıtları tarihsel kanıttır; ana branch’in güncel işlevleri değildir.
