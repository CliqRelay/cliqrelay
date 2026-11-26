import { FileText } from "lucide-react";

import { createServerExportStrategy } from "./server-export.strategy";

export const pdfExportStrategy = createServerExportStrategy({
  id: "pdf",
  format: "pdf",
  label: "PDF",
  description: "A printable document of the guide.",
  icon: FileText,
});
