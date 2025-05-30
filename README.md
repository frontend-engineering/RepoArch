# GitHub Architecture Generator

A powerful tool to automatically generate and visualize architecture diagrams for GitHub repositories. This tool helps developers understand and document their codebase structure through beautiful, interactive diagrams.

## Features

- 🎨 Automatic generation of functional and deployment architecture diagrams
- 🔄 Interactive diagram editing with drag-and-drop support
- 📊 JSON-based intermediate representation for easy integration
- 🛠 Multiple usage options: CLI, SDK, and README integration
- 🔌 Plugin system for custom diagram generation
- 📱 Responsive and beautiful visualization

## Installation

```bash
# Install globally
npm install -g github-architecture-generator

# Or use as a dev dependency in your project
npm install --save-dev github-architecture-generator
```

## Usage

### CLI Usage

# GitHub Architecture Generator
## Usage
### CLI Usage

```bash
# Generate architecture diagrams for a repository and export as Excalidraw format (default)
github-arch generate --repo username/repo-name

# Generate specific diagram types and export as Excalidraw format
github-arch generate --repo username/repo-name --type functional
github-arch generate --repo username/repo-name --type deployment

# Output to specific format, including Excalidraw
github-arch generate --repo username/repo-name --output json
github-arch generate --repo username/repo-name --output mermaid
github-arch generate --repo username/repo-name --output svg
github-arch generate --repo username/repo-name --output png
github-arch generate --repo username/repo-name --output excalidraw
```

### SDK Usage

```typescript
import { ArchitectureGenerator } from 'github-architecture-generator';

const generator = new ArchitectureGenerator({
  token: 'your-github-token'
});

// Generate functional architecture
const functionalDiagram = await generator.generateFunctionalArchitecture('username/repo-name');

// Generate deployment architecture
const deploymentDiagram = await generator.generateDeploymentArchitecture('username/repo-name');

// Export to different formats
const jsonOutput = await generator.exportToJson();
const mermaidOutput = await generator.exportToMermaid();
```

### README Integration

Add the following to your README.md:

```markdown
<!-- Architecture Diagram -->
![Architecture Diagram](https://github-architecture-generator.vercel.app/api/diagram?repo=username/repo-name&type=functional)
```

## Configuration

Create a `.github-arch-config.json` file in your project root:

```json
{
  "githubToken": "your-github-token",
  "diagramTypes": ["functional", "deployment"],
  "outputFormats": ["json", "mermaid", "svg"],
  "excludePatterns": ["node_modules", "dist"],
  "customStyles": {
    "nodeColor": "#4CAF50",
    "edgeColor": "#2196F3"
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the project
npm run build

# Run tests
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details. 