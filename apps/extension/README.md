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

Manifest permissions: `cookies`, `storage`, `unlimitedStorage`, `activeTab`, `tabs`, `webNavigation`, `alarms`, plus `sidePanel` on Chrome and `webRequest` on Firefox.

Legend:

- **Web App**: The main CliqRelay application running in a browser tab.
- **Content Script**: The script injected into web pages to capture events and interact with the page DOM. A.K.A "Browser Tab" in the diagram.
- **Background Script (Service Worker MV3)**: The background process that owns recording state, the Dexie outbox and API sync.
- **Sidepanel / Popup**: The extension's UI. It reads Dexie and `storage.session`, and sends commands to the background.

#### Chrome Extension Manifest V3 Messaging Matrix

| From (Sender)         | To (Receiver)     | Method (Outgoing)                                 | Method (Incoming / Event Listener)                                                | Context / Notes                                                                                      |
| --------------------- | ----------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Web App**           | Background Script | `chrome.runtime.sendMessage(extId, msg)`          | `chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {})` | Requires `externally_connectable` configured in `manifest.json`.                                     |
| **Web App**           | Content Script    | `window.postMessage(msg, "*")`                    | `window.addEventListener("message", (event) => {})`                               | Shared DOM context. Verify `event.source` and `event.origin` for security.                           |
| **Content Script**    | Web App           | `window.postMessage(msg, "*")`                    | `window.addEventListener("message", (event) => {})`                               | Passes bridge responses back to the CliqRelay tab.                                                   |
| **Content Script**    | Background Script | `chrome.runtime.sendMessage(capture)`             | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})`         | The capture pipeline. The worker replies after the step is written to Dexie, not after the API sync. |
| **Background Script** | Content Script    | `chrome.tabs.sendMessage(tabId, msg)`             | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})`         | Viewport lookup and highlight suppress/restore while taking a screenshot.                            |
| **Sidepanel / Popup** | Background Script | `chrome.runtime.sendMessage(command)`             | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})`         | Start/pause/stop, retry, discard and settings commands.                                              |
| **Background Script** | Sidepanel / Popup | `storage.session.onChanged` and Dexie `liveQuery` | `browser.storage.session.onChanged.addListener(...)`, `useLiveQuery(...)`         | No port and no push messages: the sidepanel observes status and local data directly.                 |

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
1. Open the extension popup.
1. Click the capture button and it will inject the content script into all open tabs.
1. Interact with the page via clicks and other events then see a live feed in the sidepanel or view your guide in CliqRelay.

## Notes

- The WXT extension is the source of truth for extension development.
- `fmt:check` package.json script command is removed intentionally for now to allow the project to pass tests and to incrementally format files as we develop since we've migrated to Oxc now.
