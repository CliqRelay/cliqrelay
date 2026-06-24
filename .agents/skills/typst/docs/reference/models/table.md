table
Element
A table of items.

Tables are used to arrange content in cells. Cells can contain arbitrary content, including multiple paragraphs and are specified in row-major order. For a hands-on explanation of all the ways you can use and customize tables in Typst, check out the Table Guide.

Because tables are just grids with different defaults for some cell properties (notably stroke and inset), refer to the grid documentation for more information on how to size the table tracks and specify the cell appearance properties.

If you are unsure whether you should be using a table or a grid, consider whether the content you are arranging semantically belongs together as a set of related data points or similar or whether you are just want to enhance your presentation by arranging unrelated content in a grid. In the former case, a table is the right choice, while in the latter case, a grid is more appropriate. Furthermore, Assistive Technology (AT) like screen readers will announce content in a table as tabular while a grid’s content will be announced no different than multiple content blocks in the document flow. AT users will be able to navigate tables two-dimensionally by cell.

Note that, to override a particular cell’s properties or apply show rules on table cells, you can use the table.cell element. See its documentation for more information.

Although the table and the grid share most properties, set and show rules on one of them do not affect the other. Locating most of your styling in set and show rules is recommended, as it keeps the table’s actual usages clean and easy to read. It also allows you to easily change the appearance of all tables in one place.

To give a table a caption and make it referenceable, put it into a figure.

Example
The example below demonstrates some of the most common table options.

#table(
columns: (1fr, auto, auto),
inset: 10pt,
align: horizon,
table.header(
[], [*Volume*], [*Parameters*],
),
image("cylinder.svg"),
$ pi h (D^2 - d^2) / 4 $,
  [
    $h$: height \
 $D$: outer radius \
 $d$: inner radius
],
image("tetrahedron.svg"),
$ sqrt(2) / 12 a^3 $,
  [$a$: edge length]
)

Much like with grids, you can use table.cell to customize the appearance and the position of each cell.

#set table(
stroke: none,
gutter: 0.2em,
fill: (x, y) =>
if x == 0 or y == 0 { gray },
inset: (right: 1.5em),
)

#show table.cell: it => {
if it.x == 0 or it.y == 0 {
set text(white)
strong(it)
} else if it.body == [] {
// Replace empty cells with 'N/A'
pad(..it.inset)[_N/A_]
} else {
it
}
}

#let a = table.cell(
fill: green.lighten(60%),
)[A]
#let b = table.cell(
fill: aqua.lighten(60%),
)[B]

#table(
columns: 4,
[], [Exam 1], [Exam 2], [Exam 3],

[John], [], a, [],
[Mary], [], a, a,
[Robert], b, a, b,
)

Accessibility
Tables are challenging to consume for users of Assistive Technology (AT). To make the life of AT users easier, we strongly recommend that you use table.header and table.footer to mark the header and footer sections of your table. This will allow AT to announce the column labels for each cell.

Because navigating a table by cell is more cumbersome than reading it visually, you should consider making the core information in your table available as text as well. You can do this by wrapping your table in a figure and using its caption to summarize the table’s content.

Parameters
table(
columns: autointrelativefractionarray,
rows: autointrelativefractionarray,
gutter: autointrelativefractionarray,
column-gutter: autointrelativefractionarray,
row-gutter: autointrelativefractionarray,
inset: relativearraydictionaryfunction,
align: autoarrayfunctionalignment,
fill: nonecolorgradienttilingarrayfunction,
stroke: nonelengthcolorgradientstroketilingarraydictionaryfunction,
..content,
) → content
columns
auto or int or relative or fraction or array
Settable
Default: ()
The column sizes. See the grid documentation for more information on track sizing.

rows
auto or int or relative or fraction or array
Settable
Default: ()
The row sizes. See the grid documentation for more information on track sizing.

gutter
auto or int or relative or fraction or array
Default: ()
The gaps between rows and columns. This is a shorthand for setting column-gutter and row-gutter to the same value. See the grid documentation for more information on gutters.

column-gutter
auto or int or relative or fraction or array
Settable
Default: ()
The gaps between columns. Takes precedence over gutter. See the grid documentation for more information on gutters.

row-gutter
auto or int or relative or fraction or array
Settable
Default: ()
The gaps between rows. Takes precedence over gutter. See the grid documentation for more information on gutters.

inset
relative or array or dictionary or function
Settable
Default: 0% + 5pt
How much to pad the cells’ content.

To specify the same inset for all cells, use a single length for all sides, or a dictionary of lengths for individual sides. See the box’s documentation for more details.

To specify a varying inset for different cells, you can:

use a single, uniform inset for all cells
use an array of insets for each column
use a function that maps a cell’s X/Y position (both starting from zero) to its inset
See the grid documentation for more details.

align
auto or array or function or alignment
Settable
Default: auto
How to align the cells’ content.

If set to auto, the outer alignment is used.

You can specify the alignment in any of the following fashions:

use a single alignment for all cells
use an array of alignments corresponding to each column
use a function that maps a cell’s X/Y position (both starting from zero) to its alignment
See the Table Guide for details.

fill
none or color or gradient or tiling or array or function
Settable
Default: none
How to fill the cells.

This can be:

a single fill for all cells
an array of fill corresponding to each column
a function that maps a cell’s position to its fill
Most notably, arrays and functions are useful for creating striped tables. See the Table Guide for more details.

stroke
none or length or color or gradient or stroke or tiling or array or dictionary or function
Settable
Default: 1pt + black
How to stroke the cells.

Strokes can be disabled by setting this to none.

If it is necessary to place lines which can cross spacing between cells produced by the gutter option, or to override the stroke between multiple specific cells, consider specifying one or more of table.hline and table.vline alongside your table cells.

To specify the same stroke for all cells, use a single stroke for all sides, or a dictionary of strokes for individual sides. See the rectangle’s documentation for more details.

To specify varying strokes for different cells, you can:

use a single stroke for all cells
use an array of strokes corresponding to each column
use a function that maps a cell’s position to its stroke
See the Table Guide for more details.

children
content
Required
Positional
Variadic
The contents of the table cells, plus any extra table lines specified with the table.hline and table.vline elements.

Definitions
cell
Element
A cell in the table. Use this to position a cell manually or to apply styling. To do the latter, you can either use the function to override the properties for a particular cell, or use it in show rules to apply certain styles to multiple cells at once.

Perhaps the most important use case of table.cell is to make a cell span multiple columns and/or rows with the colspan and rowspan fields.

For example, you can override the fill, alignment or inset for a single cell:

You may also apply a show rule on table.cell to style all cells at once. Combined with selectors, this allows you to apply styles based on a cell’s position:

table.cell(
content,
x: autoint,
y: autoint,
colspan: int,
rowspan: int,
inset: autorelativedictionary,
align: autoalignment,
fill: noneautocolorgradienttiling,
stroke: nonelengthcolorgradientstroketilingdictionary,
breakable: autobool,
) → content
body
content
Required
Positional
The cell’s body.

x
auto or int
Settable
Default: auto
The cell’s column (zero-indexed). Functions identically to the x field in grid.cell.

y
auto or int
Settable
Default: auto
The cell’s row (zero-indexed). Functions identically to the y field in grid.cell.

colspan
int
Settable
Default: 1
The amount of columns spanned by this cell.

rowspan
int
Settable
Default: 1
The amount of rows spanned by this cell.

inset
auto or relative or dictionary
Settable
Default: auto
The cell’s inset override.

align
auto or alignment
Settable
Default: auto
The cell’s alignment override.

fill
none or auto or color or gradient or tiling
Settable
Default: auto
The cell’s fill override.

stroke
none or length or color or gradient or stroke or tiling or dictionary
Settable
Default: (:)
The cell’s stroke override.

breakable
auto or bool
Settable
Default: auto
Whether rows spanned by this cell can be placed in different pages. When equal to auto, a cell spanning only fixed-size rows is unbreakable, while a cell spanning at least one auto-sized row is breakable.

hline
Element
A horizontal line in the table.

Overrides any per-cell stroke, including stroke specified through the table’s stroke field. Can cross spacing between cells created through the table’s column-gutter option.

Use this function instead of the table’s stroke field if you want to manually place a horizontal line at a specific position in a single table. Consider using table’s stroke field or table.cell’s stroke field instead if the line you want to place is part of all your tables’ designs.

table.hline(
y: autoint,
start: int,
end: noneint,
stroke: nonelengthcolorgradientstroketilingdictionary,
position: alignment,
) → content
y
auto or int
Settable
Default: auto
The row above which the horizontal line is placed (zero-indexed). Functions identically to the y field in grid.hline.

start
int
Settable
Default: 0
The column at which the horizontal line starts (zero-indexed, inclusive).

end
none or int
Settable
Default: none
The column before which the horizontal line ends (zero-indexed, exclusive).

stroke
none or length or color or gradient or stroke or tiling or dictionary
Settable
Default: 1pt + black
The line’s stroke.

Specifying none removes any lines previously placed across this line’s range, including hlines or per-cell stroke below it.

position
alignment
Settable
Default: top
The position at which the line is placed, given its row (y) - either top to draw above it or bottom to draw below it.

This setting is only relevant when row gutter is enabled (and shouldn’t be used otherwise - prefer just increasing the y field by one instead), since then the position below a row becomes different from the position above the next row due to the spacing between both.

vline
Element
A vertical line in the table. See the docs for grid.vline for more information regarding how to use this element’s fields.

Overrides any per-cell stroke, including stroke specified through the table’s stroke field. Can cross spacing between cells created through the table’s row-gutter option.

Similar to table.hline, use this function if you want to manually place a vertical line at a specific position in a single table and use the table’s stroke field or table.cell’s stroke field instead if the line you want to place is part of all your tables’ designs.

table.vline(
x: autoint,
start: int,
end: noneint,
stroke: nonelengthcolorgradientstroketilingdictionary,
position: alignment,
) → content
x
auto or int
Settable
Default: auto
The column before which the vertical line is placed (zero-indexed). Functions identically to the x field in grid.vline.

start
int
Settable
Default: 0
The row at which the vertical line starts (zero-indexed, inclusive).

end
none or int
Settable
Default: none
The row on top of which the vertical line ends (zero-indexed, exclusive).

stroke
none or length or color or gradient or stroke or tiling or dictionary
Settable
Default: 1pt + black
The line’s stroke.

Specifying none removes any lines previously placed across this line’s range, including vlines or per-cell stroke below it.

position
alignment
Settable
Default: start
The position at which the line is placed, given its column (x) - either start to draw before it or end to draw after it.

The values left and right are also accepted, but discouraged as they cause your table to be inconsistent between left-to-right and right-to-left documents.

This setting is only relevant when column gutter is enabled (and shouldn’t be used otherwise - prefer just increasing the x field by one instead), since then the position after a column becomes different from the position before the next column due to the spacing between both.

header
Element
A repeatable table header.

You should wrap your tables’ heading rows in this function even if you do not plan to wrap your table across pages because Typst uses this function to attach accessibility metadata to tables and ensure Universal Access to your document.

You can use the repeat parameter to control whether your table’s header will be repeated across pages.

Currently, this function is unsuitable for creating a header column or single header cells. Either use regular cells, or, if you are exporting a PDF, you can also use the pdf.header-cell function to mark a cell as a header cell. Likewise, you can use pdf.data-cell to mark cells in this function as data cells. Note that these functions are not final and thus only available when you enable the a11y-extras feature (see the PDF module documentation for details).

table.header(
repeat: bool,
level: int,
..content,
) → content
repeat
bool
Settable
Default: true
Whether this header should be repeated across pages.

level
int
Settable
Default: 1
The level of the header. Must not be zero.

This allows repeating multiple headers at once. Headers with different levels can repeat together, as long as they have ascending levels.

Notably, when a header with a lower level starts repeating, all higher or equal level headers stop repeating (they are “replaced” by the new header).

children
content
Required
Positional
Variadic
The cells and lines within the header.

footer
Element
A repeatable table footer.

Just like the table.header element, the footer can repeat itself on every page of the table. This is useful for improving legibility by adding the column labels in both the header and footer of a large table, totals, or other information that should be visible on every page.

No other table cells may be placed after the footer.

table.footer(
repeat: bool,
..content,
) → content
repeat
bool
Settable
Default: true
Whether this footer should be repeated across pages.

children
content
Required
Positional
Variadic
The cells and lines within the footer.
