# Landing Page Template

Modern, responsive landing page perfect for product launches and marketing campaigns.

## Features

- ✨ **Modern design** with Tailwind CSS
- 📱 **Fully responsive** (mobile, tablet, desktop)
- ⚡ **No build required** - deploy instantly
- 🎨 **Easy customization** via template variables
- 🔧 **Interactive components** with Alpine.js

## Quick Start

### Via CLI
```bash
br templates use landing-page --name "My Product Landing Page"
```

### Via SDK
```typescript
await brail.deployTemplate({
  template: 'landing-page',
  siteName: 'my-landing-page',
  variables: {
    SITE_TITLE: 'My Amazing Product',
    SITE_DESCRIPTION: 'The best solution for your needs',
    CTA_TEXT: 'Try It Free',
    PRIMARY_COLOR: '#3b82f6'
  }
});
```

## Customization

### Template Variables

- `SITE_TITLE` - Main title for your page
- `SITE_DESCRIPTION` - Short description of your product
- `CTA_TEXT` - Call to action button text
- `PRIMARY_COLOR` - Primary brand color (hex code)

### Advanced Customization

Clone the template locally to make deeper changes:

```bash
br templates clone landing-page ./my-landing-page
cd my-landing-page
# Edit index.html, add your own images, etc.
br drop . --site my-site
```

## Sections Included

1. **Navigation** - Sticky header with mobile menu
2. **Hero** - Eye-catching hero section with CTA
3. **Features** - Highlight key features (3 columns)
4. **Pricing** - 3-tier pricing table
5. **FAQ** - Collapsible FAQ section
6. **Contact/CTA** - Email signup form
7. **Footer** - Complete footer with links

## Technologies

- **HTML5** - Semantic markup
- **Tailwind CSS** - Utility-first styling (via CDN)
- **Alpine.js** - Lightweight interactivity (via CDN)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Free to use for personal and commercial projects. No attribution required.

