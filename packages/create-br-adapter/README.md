# create-br-adapter

Scaffold a new deployment adapter for [Brail](https://github.com/kagehq/brail).

## Usage

```bash
npm create br-adapter my-custom-adapter
```

Or with other package managers:

```bash
# pnpm
pnpm create br-adapter my-custom-adapter

# yarn
yarn create br-adapter my-custom-adapter
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

1. **Adapter name** - What to call your adapter
2. **Description** - Brief description of the platform
3. **Author** - Your name or organization
4. **License** - License type (MIT, Apache-2.0, etc.)

## Project Structure

```
my-custom-adapter/
├── src/
│   └── index.ts          # Main adapter implementation
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript config
└── README.md            # Documentation
```

## Next Steps

After creating your adapter:

```bash
cd my-custom-adapter
npm install
npm run build
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

