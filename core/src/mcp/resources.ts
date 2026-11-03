// Resources whose body is resolved from the workspace at read time through
// the one hbf:// resolver (packages/project): hbf://project/graph, and the
// template hbf://check/{id} that a finding's origin names. They are not in
// MCP_RESOURCES because discover hashes those bodies synchronously.

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { canonicalize } from "@hackbuild/spec";
import { explainUri } from "../commands/explain.js";

const JSON_MIME = "application/json";

/** Register the graph resource and the check template on server; root is the hbf install the resolver reads. */
export function registerLiveResources(server: McpServer, root: string): void {
  server.registerResource("project-graph", "hbf://project/graph", {
    title: "project graph",
    description: "The project graph of the workspace as hbf project.graph reports it: items, edges and the stale list, as RFC 8785 canonical json.",
    mimeType: JSON_MIME,
  }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: JSON_MIME, text: canonicalize((await explainUri("hbf://project/graph", root)).value) }],
  }));
  server.registerResource("check", new ResourceTemplate("hbf://check/{id}", {
    list: undefined,
  }), {
    title: "check record",
    description: "One check record by id, as hbf explain hbf://check/<id> resolves it: title, version, severity, origin and legal kind.",
    mimeType: JSON_MIME,
  }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: JSON_MIME, text: canonicalize((await explainUri(uri.href, root)).value) }],
  }));
}
