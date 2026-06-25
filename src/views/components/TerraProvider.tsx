import { setBasePath } from "@nasa-terra/components/dist/utilities/base-path.js";
import type { ReactNode } from "react";

setBasePath("https://cdn.jsdelivr.net/npm/@nasa-terra/components@latest/cdn/");

/**
 * A wrapper over Terra UI components to ease the usage MCP UI
 */
export default function TerraProvider(props: { children: ReactNode }) {
  return <>{props.children}</>;
}
