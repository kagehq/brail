# Brail Templates

Pre-built, production-ready templates you can deploy in seconds. Perfect for non-coders and rapid prototyping.

## Available Templates

### 1. **Landing Page** (`landing-page`)
Modern marketing landing page with hero section, features, pricing, and contact form.
- **Tech**: HTML, Tailwind CSS, Alpine.js
- **Deploy time**: < 30 seconds
- **Perfect for**: Product launches, marketing campaigns

### 2. **Portfolio** (`portfolio`)
Clean, minimal portfolio for designers, developers, and creatives.
- **Tech**: HTML, CSS, Vanilla JS
- **Deploy time**: < 30 seconds
- **Perfect for**: Personal branding, showcasing work

### 3. **Blog** (`blog`)
Fast, SEO-friendly blog with markdown support.
- **Tech**: Astro, Tailwind CSS
- **Deploy time**: ~1 minute
- **Perfect for**: Content creators, writers

### 4. **Documentation Site** (`docs`)
Professional documentation site with search and navigation.
- **Tech**: VitePress
- **Deploy time**: ~1 minute
- **Perfect for**: Project docs, API references, guides

### 5. **Coming Soon** (`coming-soon`)
Minimal "coming soon" page with email signup.
- **Tech**: HTML, Tailwind CSS
- **Deploy time**: < 20 seconds
- **Perfect for**: Pre-launch buzz, early access

## Usage

### Via CLI

```bash
# List available templates
br templates list

# Use a template
br templates use landing-page --site my-site

# Or create new site from template
br templates use landing-page --name "My Awesome Landing Page"
```

### Via Web Dashboard

1. Go to **Templates** in the sidebar
2. Browse available templates
3. Click **Use This Template**
4. Customize and deploy

### Via SDK

```typescript
import { Brail } from '@brailhq/sdk';

const brail = new Brail({ apiKey: 'xxx' });

// Clone template and deploy
await brail.deployTemplate({
  template: 'landing-page',
  siteName: 'my-landing-page',
  variables: {
    title: 'My Product',
    description: 'The best product ever'
  }
});
```

## Customization

All templates support customization via environment variables or direct file editing:

```bash
# Clone template locally for customization
br templates clone landing-page ./my-landing-page

# Edit files
cd my-landing-page
# ... make changes ...

# Deploy
br drop . --site my-site
```

## Template Structure

Each template includes:
- `template.json` - Template metadata and configuration
- `preview.png` - Template preview image
- `README.md` - Template-specific documentation
- Source files ready to deploy

## Contributing Templates

Want to add your own template? See [CONTRIBUTING.md](../CONTRIBUTING.md).

