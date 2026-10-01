# json-selection-formatter

Unescape and format selected JSON - Chrome bookmarklet.

## Installation

1. Go to chrome://extensions.
2. Turn on Developer mode (top right).
3. Click Load unpacked and choose the ~/json-selection-formatter folder.

## Usage

Select any JSON in the browser window, right click, then click **Format selected JSON**.

<table>
<tr>
<td>
<img src="https://github.com/jonathanconway/json-selection-formatter/blob/main/docs/screenshot-chrome-right-click-menu-item.png" alt="Screenshot of right click menu in Chrome with Format selected JSON menu item" />
</td>
<td>
<img src="https://github.com/jonathanconway/json-selection-formatter/blob/main/docs/screenshot-chrome-json-formatted-output.png" alt="Screenshot of Chrome window with JSON formatted output" />
</td>
</tr>
</table>

## Credits

Vibe coded with Claude Code Opus 5.5.

Prompts:

* Is there a browser extension that allows me to select any region of a page that is JSON and formats it nicely (unescaping, indentation, syntax highlighting, etc) and shows it to me?
* I got this error in the Javascript snippet: <error>. Can you help me fix it?.
* Turn this into a small unpacked Chrome extension with a right-click "Format selected JSON" menu item, which works on those strict-policy sites too.
