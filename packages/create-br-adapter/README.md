# create-br-adapter

Scaffold a new deployment adapter for [Brail](https://github.com/kagehq/brail).

## Usage

```bash
npm create br-adapter
```

The CLI will interactively prompt you for:
- Adapter name
- Display name  
- Description

Or with other package managers:

```bash
# pnpm
pnpm create br-adapter

# yarn
yarn create br-adapter
```

## What You Get

This scaffolder creates a complete adapter project with:

- ✅ TypeScript setup
- ✅ Adapter boilerplate using `@brailhq/adapter-kit`
- ✅ Example deployment logic
- ✅ Configuration schema
- ✅ README with documentation
- ✅ Build scripts

## Interactive Setup

The CLI will ask you:

1. **Adapter name** - What to call your adapter (lowercase with dashes)
2. **Display name** - Human-readable name for your adapter
3. **Description** - Brief description of what platform it deploys to

## Next Steps

After creating your adapter:

```bash
cd br-adapter-{name}  # Directory name matches your adapter
npm install
npm run dev           # Watch mode for development
```

Then use it in your Brail project:

```bash
npm link
# or
npm publish
```

## Learn More

- [Adapter Kit Documentation](https://www.npmjs.com/package/@brailhq/adapter-kit)
- [Brail Repository](https://github.com/kagehq/brail)
- [Example Adapters](https://github.com/kagehq/brail/tree/main/packages/adapters)

## License

FSL-1.1-MIT © Treadie, Inc.

