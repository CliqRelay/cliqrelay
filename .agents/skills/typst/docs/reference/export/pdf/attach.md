attach
Element
A file that will be attached to the output PDF.

This can be used to distribute additional files associated with the PDF within it. PDF readers will display the files in a file listing.

Some international standards use this mechanism to attach machine-readable data (e.g., ZUGFeRD/Factur-X for invoices) that mirrors the visual content of the PDF.

Example
#pdf.attach(
"experiment.csv",
relationship: "supplement",
mime-type: "text/csv",
description: "Raw Oxygen readings from the Arctic experiment",
)
Notes
This element is ignored if exporting to a format other than PDF.
File attachments are not currently supported for PDF/A-2, even if the attached file conforms to PDF/A-1 or PDF/A-2.
Parameters
attach(
strpath,
bytes,
relationship: nonestr,
mime-type: nonestr,
description: nonestr,
) → content
path
str or path
Required
Positional
The path of the file to be attached.

Must always be specified, but is only read from if no data is provided in the following argument.

data
bytes
Required
Positional
Raw file data, optionally.

If omitted, the data is read from the specified path.

relationship
none or str
Settable
Default: none
The relationship of the attached file to the document.

Ignored if export doesn’t target PDF/A-3.

Variant Details
"source" The PDF document was created from the source file.
"data" The file was used to derive a visual presentation in the PDF.
"alternative" An alternative representation of the document.
"supplement" Additional resources for the document.
mime-type
none or str
Settable
Default: none
The MIME type of the attached file.

description
none or str
Settable
Default: none
A description for the attached file.
