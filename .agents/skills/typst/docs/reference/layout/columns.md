columns
Element
Separates a region into multiple equally sized columns.

The column function lets you separate the interior of any container into multiple columns. It will currently not balance the height of the columns. Instead, the columns will take up the height of their container or the remaining height on the page. Support for balanced columns is planned for the future.

When arranging content across multiple columns, use colbreak to explicitly continue in the next column.

Example
#columns(2, gutter: 8pt)[
This text is in the
first column.

#colbreak()

This text is in the
second column.
]

Page-level columns
If you need to insert columns across your whole document, use the page function’s columns parameter instead. This will create the columns directly at the page-level rather than wrapping all of your content in a layout container. As a result, things like pagebreaks, footnotes, and line numbers will continue to work as expected. For more information, also read the relevant part of the page setup guide.

Breaking out of columns
To temporarily break out of columns (e.g. for a paper’s title), use parent-scoped floating placement:

#set page(columns: 2, height: 150pt)

#place(
top + center,
scope: "parent",
float: true,
text(1.4em, weight: "bold")[
My document
],
)

#lorem(40)

Parameters
columns(
int,
gutter: relative,
content,
) → content
count
int
Positional
Settable
Default: 2
The number of columns.

gutter
relative
Settable
Default: 4% + 0pt
The size of the gutter space between each column.

body
content
Required
Positional
The content that should be layouted into the columns.
