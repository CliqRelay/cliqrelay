block
Element
A block-level container.

Such a container can be used to separate content, size it, and give it a background or border.

Blocks are also the primary way to control whether text becomes part of a paragraph or not. See the paragraph documentation for more details.

Examples
With a block, you can give a background to content while still allowing it to break across multiple pages.

#set page(height: 100pt)
#block(
fill: luma(230),
inset: 8pt,
radius: 4pt,
lorem(30),
)

Blocks are also useful to force elements that would otherwise be inline to become block-level, especially when writing show rules.

#show heading: it => it.body
= Blockless
More text.

#show heading: it => block(it.body)
= Blocky
More text.

Parameters
block(
width: autorelative,
height: autorelativefraction,
breakable: bool,
fill: nonecolorgradienttiling,
stroke: nonelengthcolorgradientstroketilingdictionary,
radius: relativedictionary,
inset: relativedictionary,
outset: relativedictionary,
spacing: autorelativefraction,
above: autorelativefraction,
below: autorelativefraction,
clip: bool,
sticky: bool,
nonecontent,
) → content
width
auto or relative
Settable
Default: auto
The block’s width.

height
auto or relative or fraction
Settable
Default: auto
The block’s height. When the height is larger than the remaining space on a page and breakable is true, the block will continue on the next page with the remaining height.

breakable
bool
Settable
Default: true
Whether the block can be broken and continue on the next page.

fill
none or color or gradient or tiling
Settable
Default: none
The block’s background color. See the rectangle’s documentation for more details.

stroke
none or length or color or gradient or stroke or tiling or dictionary
Settable
Default: (:)
The block’s border color. See the rectangle’s documentation for more details.

radius
relative or dictionary
Settable
Default: (:)
How much to round the block’s corners. See the rectangle’s documentation for more details.

inset
relative or dictionary
Settable
Default: (:)
How much to pad the block’s content. See the box’s documentation for more details.

outset
relative or dictionary
Settable
Default: (:)
How much to expand the block’s size without affecting the layout. See the box’s documentation for more details.

spacing
auto or relative or fraction
Default: 1.2em
The spacing around the block. When auto, inherits the paragraph spacing.

For two adjacent blocks, the larger of the first block’s below and the second block’s above spacing wins. Moreover, block spacing takes precedence over paragraph spacing.

Note that this is only a shorthand to set above and below to the same value. Since the values for above and below might differ, a context block only provides access to block.above and block.below, not to block.spacing directly.

This property can be used in combination with a show rule to adjust the spacing around arbitrary block-level elements.

above
auto or relative or fraction
Settable
Default: auto
The spacing between this block and its predecessor.

below
auto or relative or fraction
Settable
Default: auto
The spacing between this block and its successor.

clip
bool
Settable
Default: false
Whether to clip the content inside the block.

Clipping is useful when the block’s content is larger than the block itself, as any content that exceeds the block’s bounds will be hidden.

sticky
bool
Settable
Default: false
Whether this block must stick to the following one, with no break in between.

This is, by default, set on heading blocks to prevent orphaned headings at the bottom of the page.

body
none or content
Positional
Settable
Default: none
The contents of the block.
