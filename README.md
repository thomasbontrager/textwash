# TextWash — Universal Text Cleaner

A privacy-first, lightweight text cleaning tool that runs 100% locally in your browser. No tracking. No data uploads. No nonsense.

## Features

✨ **Automatic Text Cleaning**
- Normalizes line breaks (converts `\r\n` to `\n`)
- Fixes smart quotes and dashes to standard ASCII characters
- Removes excess whitespace and trailing spaces
- Collapses multiple line breaks into single line breaks
- Trims leading and trailing whitespace

🔒 **Privacy First**
- All processing happens locally in your browser
- Zero server uploads
- Zero tracking or analytics
- Works completely offline

⚡ **Fast & Simple**
- One-click cleaning
- Copy cleaned text to clipboard with one click
- Beautiful, modern UI
- Responsive design for all devices

## How to Use

1. Visit [TextWash](https://textwash.app)
2. Paste your messy text in the input box
3. Click **Clean Text**
4. Click **Copy Clean Text** to copy the result

## What Gets Cleaned

### Line Breaks
- Windows-style `\r\n` → Unix-style `\n`
- Multiple consecutive line breaks → Single line break

### Punctuation
- Smart quotes (`""` or `''`) → Standard quotes (`"` or `'`)
- Em dashes and en dashes (`–`, `—`) → Hyphen (`-`)

### Whitespace
- Excess spaces and tabs → Single space
- Trailing whitespace on each line → Removed
- Leading/trailing whitespace → Removed

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **Vanilla JavaScript** - No dependencies required
- **GitHub Pages** - Free hosting

## Project Structure

```
textwash/
├── index.html      # Main HTML file
├── style.css       # Styling and animations
├── app.js          # Text cleaning logic
├── assets/         # Images and favicon
└── README.md       # This file
```

## Browser Support

Works in all modern browsers that support:
- ES6 JavaScript
- CSS Grid
- CSS Gradients
- CSS Animations

## Development

This is a static site with no build process required. To run locally:

1. Clone the repository
2. Open `index.html` in your browser
3. Start cleaning text!

## License

Open source and available for anyone to use and modify.

## Built By

Created by [Thomas Bontrager](https://github.com/thomasbontrager)

---

Prefer a premium version? Visit [TextWash](https://textwash.app) to support development.