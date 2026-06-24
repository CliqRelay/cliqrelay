artifact
Element
Marks content as a PDF artifact.

Artifacts are parts of the document that are not meant to be read by Assistive Technology (AT), such as screen readers. Typical examples include purely decorative images that do not contribute to the meaning of the document, watermarks, or repeated content such as page numbers.

Typst will automatically mark certain content, such as page headers, footers, backgrounds, and foregrounds, as artifacts. Likewise, paths and shapes are automatically marked as artifacts, but their content is not. Line numbers created using par.line are automatically marked as artifacts, as are repetitions of table headers and footers.

Once something is marked as an artifact, you cannot make any of its contents accessible again. If you need to mark only part of something as an artifact, you may need to use this function multiple times.

If you are unsure what constitutes an artifact, check the Accessibility Guide.

In the future, this function may be moved out of the pdf module, making it possible to hide content in HTML export from AT.

Parameters
artifact(
kind: str,
content,
) → content
kind
str
Settable
Default: "other"
The artifact kind.

You can improve accessibility by using the most specific artifact kind available. Your choice will govern how the PDF reader treats the artifact during reflow and content extraction (e.g. copy and paste).

Artifact types have been introduced in various different PDF specifications. Depending on which PDF version you target, Typst will select the most appropriate artifact type using your selection here.

body
content
Required
Positional
The content that is an artifact.
