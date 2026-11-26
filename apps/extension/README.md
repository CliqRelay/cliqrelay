# Extension

Browser extension for capturing clicks, input, keypresses, navigation and more as well as metadata from any page.

## Architecture

Capture is local-first. The background service worker writes every step to a Dexie (IndexedDB) outbox before any network call, so the worker can be suspended mid-session without losing data.

```
Browser Tab
	↓  content script captures events
Content Script
	↓  browser.runtime.sendMessage(capture)
Background Service Worker
	├─ captureVisibleTab, compress to WebP
	├─ write session/step/blob rows to Dexie
	├─ drain the outbox to the API (alarms + worker wake-ups)
	└─ mirror recording status in storage.session
		▲
Sidepanel
	├─ Dexie liveQuery for sessions, steps and sync counts
	├─ storage.session.onChanged for recording status
	└─ browser.runtime.sendMessage(command)
```

There is no offscreen document and no long-lived port. The sidepanel never writes Dexie: the background owns local captures. The outbox uses a 1-minute `alarms` drain while recording plus a daily retention alarm, and sync failures stay local until retried or pruned after 7 days.

Legend:

- **Web App**: The main CliqRelay application running in a browser tab.
- **Content Script**: The script injected into web pages to capture events and interact with the page DOM. A.K.A "Browser Tab" in the diagram.
- **Background Script (Service Worker MV3)**: The background process that owns recording state, the Dexie outbox and API sync.
- **Sidepanel / Popup**: The extension's UI. It reads Dexie and `storage.session`, and sends commands to the background.

#### Chrome Extension Manifest V3 Messaging Matrix

| From (Sender)         | To (Receiver)     | Method (Outgoing)                                 | Method (Incoming / Event Listener)                                                | Context / Notes                                                                              |
| --------------------- | ----------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Web App**           | Background Script | `chrome.runtime.sendMessage(extId, msg)`          | `chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {})` | Requires `externally_connectable` configured in `manifest.json`.                             |
| **Web App**           | Content Script    | `window.postMessage(msg, "*")`                    | `window.addEventListener("message", (event) => {})`                               | Shared DOM context. Verify `event.source` and `event.origin` for security.                   |
| **Content Script**    | Web App           | `window.postMessage(msg, "*")`                    | `window.addEventListener("message", (event) => {})`                               | Passes bridge responses back to the CliqRelay tab.                                           |
| **Content Script**    | Background Script | `chrome.runtime.sendMessage(capture)`             | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})`         | The worker acknowledges the capture immediately, then writes it to Dexie and syncs it later. |
| **Background Script** | Content Script    | `chrome.tabs.sendMessage(tabId, msg)`             | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})`         | Highlight suppress/restore while taking a screenshot.                                        |
| **Sidepanel / Popup** | Background Script | `chrome.runtime.sendMessage(command)`             | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})`         | Recording, retry, delete, discard and settings commands.                                     |
| **Background Script** | Sidepanel / Popup | `storage.session.onChanged` and Dexie `liveQuery` | `browser.storage.session.onChanged.addListener(...)`, `useLiveQuery(...)`         | No port and no push messages: the sidepanel observes status and local data directly.         |

## Permissions

- `cookies` — read CliqRelay CSRF/active-team cookies and detect sign-out via `cookies.onChanged`.
- `storage` — settings and recording status in `storage.local`, recording lifecycle in `storage.session`.
- `unlimitedStorage` — lifts quota and eviction limits for the Dexie/IndexedDB outbox, which keeps full WebP screenshots until upload and for up to 7 days.
- `activeTab` — temporary access to the active tab for screenshot capture and content-script messaging.
- `tabs` — query/read tabs, message content scripts, call `captureVisibleTab`, and open the sign-in tab.
- `webNavigation` — record navigation steps on `onCompleted` and discard stale ones on `onErrorOccurred`.
- `alarms` — wake the MV3 worker every minute to drain the outbox and daily to prune expired data. Required because service workers die when idle.
- `sidePanel` (Chrome) — open the side panel from the toolbar action and external messages.
- `webRequest` (Firefox) — Firefox manifest compatibility; no current code path uses it.
- `<all_urls>` host permission — inject the content script on any page and allow visible-tab captures.

## Development

Make a copy of the `.env.example` file and name it `.env` and fill in the values.

```bash
# Install dependencies
$ pnpm i

# Start development server with hot reload
$ pnpm dev

# Now you can drop the `dist/chrome-mv3-dev` folder into Chrome as an unpacked extension and it will automatically reload on changes.
```

## Build

```bash
$ pnpm build
```

The production build is emitted to `dist/chrome-mv3/`.

## Testing

```bash
$ pnpm test

# Run tests in a UI
$ pnpm test:ui
```

## Install

1. Open Chrome and go to `chrome://extensions`.
1. Enable Developer mode.
1. Click Load unpacked.
1. Select the `dist/chrome-mv3-dev/` (development) or `dist/chrome-mv3/` (production) folder.

## Usage

1. Open CliqRelay in a tab.
1. Open the extension side panel.
1. Click Start recording.
1. Interact with the page. Captured steps appear in the side panel and sync to CliqRelay.

## Notes

- The WXT extension is the source of truth for extension development.
- `fmt:check` package.json script command is removed intentionally for now to allow the project to pass tests and to incrementally format files as we develop since we've migrated to Oxc now.
