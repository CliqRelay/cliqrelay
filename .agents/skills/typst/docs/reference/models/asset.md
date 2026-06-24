asset
Element
Adds a custom file to a bundle.

This function creates a single file in a bundle, from raw byte data. Unlike documents, assets will be emitted as-is without undergoing compilation.

The asset function can be combined with read to copy a file from the project into the output bundle. The first argument to asset defines the output path for the asset in the bundle, while the path passed to read defines where in the project to read the data from.

// Copy the file `styles.css` into the bundle.
#asset("styles.css", read("styles.css"))
That said, asset is not tied to read. You can also generate bytes directly or use a function like json.encode to emit serialized data.

// Emits a JSON file with the number
// of headings in the document.
#context {
let headings = query(heading)
let meta = (
count: headings.len(),
)
asset("meta.json", json.encode(meta))
}

#document("doc.pdf")[
= Introduction
= Conclusion
]
This would emit a meta.json file with the following contents into the resulting bundle:

{
"count": 2
}
This function may only be used in the bundle target.

Parameters
asset(
str,
strbytes,
) → content
path
str
Required
Positional
The path in the bundle at which the asset will be placed.

May contain interior slashes, in which case intermediate directories will be automatically created.

data
str or bytes
Required
Positional
The raw data that will be written into the file at the specified path.

If a string is given, it will be encoded using UTF-8.
