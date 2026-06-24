divider
Element
A thematic break that separates sections of content.

By default, it renders as a horizontal line, but it can be customized through show rules.

Example
She left without a word.
#divider()
Three days later, she returned.

Styling
The divider can be styled through show rules.

Since the divider shows as a line by default, you can use a set rule to adjust the line’s stroke:

#show divider: set line(stroke: 2pt + red)
First part
#divider()
Second part

You can also fully replace the divider with custom content like a floral or asterisks, but then you should wrap it in a block to preserve spacing:

#show divider: set align(center)
#show divider: block[∗ ∗ ∗]
Chapter 1
#divider()
Chapter 2

Parameters
divider() → content
