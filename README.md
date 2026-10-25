# JSON Viewer

A small browser-based JSON viewer and editor. The project is being built as a way to learn JavaScript through parsing, rendering, and editing nested data.

## Features

- Load a `.json` file by selecting it or dropping it onto the page.
- Paste JSON into the paste box or load the built-in sample.
- Browse nested objects and arrays in collapsible blocks.
- See a summary of the value types in the loaded data.
- Edit text and numbers, toggle booleans, and edit color values.
- Change `null` values to another supported type.
- Add and delete object properties and array entries.

## Run locally

1. Open the project folder in VS Code.
2. Start `index.html` with the Live Server extension, or serve the folder with another local web server.
3. Open the local address shown by the server in your browser.

There is no build step. The color picker, Coloris, is loaded from a CDN, so that feature requires an internet connection.

## Project files

- `index.html` — page structure and external Coloris assets.
- `styles.css` — layout and visual styling.
- `parser.js` — JSON parsing, rendering, editing, and file input behavior.

## Learning and credits

The main purpose of this project is to practice JavaScript, including DOM manipulation, event handling, recursive data rendering, and working with nested object paths. The CSS file was written with the assistance of an LLM. 