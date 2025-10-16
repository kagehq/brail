# Example Site with Tailwind CSS

A simple static website demonstrating Brail deployment with Tailwind CSS.

## Features

- 🎨 **Tailwind CSS** - Utility-first CSS framework
- ⚡ **Fast Builds** - Compiled CSS is minified and optimized
- 🚀 **Brail Deployment** - Automatic build detection and deployment

## Local Development

```bash
# Install dependencies
npm install

# Watch mode (rebuilds CSS on changes)
npm run dev

# Production build
npm run build
```

## Deploying to Brail

### Via Web UI

1. Drag and drop the `example-site` folder into Brail
2. Brail will automatically:
   - Detect the build command (`npm run build`)
   - Install dependencies
   - Run the build
   - Deploy the output

### Via CLI

```bash
# Install Brail CLI
npm install -g @br/cli

# Login
br login

# Deploy
br drop . --site <your-site-id> --yes
```

## File Structure

```
example-site/
├── src/
│   └── input.css          # Tailwind source CSS
├── index.html             # Main HTML (uses Tailwind classes)
├── app.js                 # JavaScript
├── style.css              # Generated CSS (git-ignored)
├── package.json           # Dependencies & build script
├── tailwind.config.js     # Tailwind configuration
├── .dropignore            # Files to exclude from deployment
└── _drop.json             # Brail headers & redirects config
```

## .dropignore

The `.dropignore` file tells Brail which files to exclude from deployment:

```
node_modules/       # Dependencies (Brail installs them on server)
package-lock.json   # Lock files
src/                # Source files (only need built CSS)
tailwind.config.js  # Build config (not needed in production)
.git/               # Git directory
```

This keeps deployments fast by only uploading what's needed!

## Customization

### Tailwind Config

Edit `tailwind.config.js` to customize your design system:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#your-color',
      },
    },
  },
}
```

### Custom CSS

Add custom styles in `src/input.css`:

```css
@layer components {
  .my-custom-class {
    @apply bg-blue-500 text-white p-4;
  }
}
```

## Build Output

- **Input**: `src/input.css` (3 KB with directives)
- **Output**: `style.css` (minified, ~10-50 KB depending on usage)

Tailwind automatically purges unused styles, so only the classes you use in HTML/JS are included in the final CSS.

## Learn More

- [Brail Documentation](https://github.com/kagehq/brail)
- [Tailwind CSS](https://tailwindcss.com)

