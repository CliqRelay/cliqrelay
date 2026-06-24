# CliqRelay Extension

Browser extension for capturing clicks, input, keypresses, navigation and more as well as metadata from any page.

## Architecture

```
Browser Tab
	↓  content script captures events
Content Script
	↓  browser.runtime.sendMessage
Background Worker
	↓  browser.tabs.sendMessage
Messaging Bridge in CliqRelay tab
	↓  window.postMessage
CliqRelay
```

This table shows which components communicate with each other and how they do it:

Legend:
- **Web App**: The main CliqRelay application running in a browser tab.
- **Content Script**: The script injected into web pages to capture events and interact with the page DOM. A.K.A "Browser Tab" in the diagram.
- **Background Script (Service Worker MV3)**: The background process that manages state and facilitates communication between content scripts and the web app.
- **Sidepanel / Popup**: The extension's UI components that can also send/receive messages to/from the background script and content scripts.

#### Chrome Extension Manifest V3 Messaging Matrix

| From (Sender) | To (Receiver) | Method (Outgoing) | Method (Incoming / Event Listener) | Context / Notes |
| --- | --- | --- | --- | --- |
| **Web App** | Background Script | `chrome.runtime.sendMessage(extId, msg)` | `chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {})` | Requires `externally_connectable` configured in `manifest.json`. |
| **Web App** | Content Script | `window.postMessage(msg, "*")` | `window.addEventListener("message", (event) => {})` | Shared DOM context. Highly recommended to verify `event.source` and `event.origin` for security. |
| **Content Script** | Web App | `window.postMessage(msg, "*")` or `document.dispatchEvent(new CustomEvent(name))` | `window.addEventListener("message", ...)` or `document.addEventListener(name, ...)` | Allows the isolated Content Script to pass scraped DOM context back to your main app. |
| **Content Script** | Background, Sidepanel, or Popup | `chrome.runtime.sendMessage(msg)` | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})` | Standard internal extension message pipeline. Broadcasts instantly to all active internal views. |
| **Background Script** | Content Script | `chrome.tabs.sendMessage(tabId, msg)` | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})` | Requires an active, explicit `tabId` target to route the payload downward. |
| **Background Script** | Sidepanel / Popup | `chrome.runtime.sendMessage(msg)` | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})` | Internal messaging channel. If both are open, both catch the event unless scoped in your payload. |
| **Sidepanel / Popup** | Content Script | `chrome.tabs.sendMessage(tabId, msg)` | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})` | Used to pass active control instructions (like "Start highlighting clicked elements") down to the page DOM. |
| **Sidepanel / Popup** | Background Script | `chrome.runtime.sendMessage(msg)` | `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {})` | Used to tell the background service worker to write data to long-term state or dispatch a network payload. |

## Development

Make a copy of the `.env.example` file and name it `.env` and fill in the values.

```bash
# Install dependencies
$ pnpm i

# Start development server with hot reload
$ pnpm run dev

# Now you can drop the `dist/chrome-mv3-dev` folder into Chrome as an unpacked extension and it will automatically reload on changes.
```

## Build

```bash
$ pnpm run build
```

The production build is emitted to `dist/chrome-mv3/`.

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
