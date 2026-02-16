import { ToolRegistry } from '../agents/tool.registry';
import { WebSearchTool } from '../agents/tools/web-search.tool';

/**
 * Initialize and register all tools
 */
export function initializeTools(): void {
  // Web Tools
  ToolRegistry.register(new WebSearchTool());

  // Additional tools will be registered here
  // ToolRegistry.register(new URLIngestionTool());
  // ToolRegistry.register(new RAGSearchTool());

  // System Tools
  // ToolRegistry.register(new DatabaseQueryTool());
  // ToolRegistry.register(new PythonSandboxTool());
  // ToolRegistry.register(new ChartGeneratorTool());

  // File Tools
  // ToolRegistry.register(new PDFReaderTool());
  // ToolRegistry.register(new CSVReaderTool());
  // ToolRegistry.register(new DOCXReaderTool());

  // Media Tools
  // ToolRegistry.register(new ImageGenerationTool());
  // ToolRegistry.register(new TextToSpeechTool());

  console.log(`✅ Registered ${ToolRegistry.listTools().length} tools`);
}
