location
Identifies an element in the document.

A location uniquely identifies an element in the document and lets you access its absolute position on the pages. You can retrieve the current location with the here function and the location of a queried or shown element with the location() method on content.

Locatable elements
Elements that are automatically assigned a location are called locatable. For efficiency reasons, not all elements are locatable.

In the Model category, most elements are locatable. This is because semantic elements like headings and figures are often used with introspection.

In the Text category, the raw element, and the decoration elements underline, overline, strike, and highlight are locatable as these are also quite semantic in nature.

In the Introspection category, the metadata element is locatable as being queried for is its primary purpose.

In the other categories, most elements are not locatable. Exceptions are math.equation and image.

To find out whether a specific element is locatable, you can try to query for it.

Note that you can still observe elements that are not locatable in queries through other means, for instance, when they have a label attached to them.

Definitions
page
Returns the page number for this location.

Note that this does not return the value of the page counter at this location, but the true page number (starting from one).

If you want to know the value of the page counter, use counter(page).at(loc) instead.

Can be used with here to retrieve the physical page position of the current context:

self.page() → int
position
Returns a dictionary with the page number and the x, y position for this location. The page number starts at one and the coordinates are measured from the top-left of the page.

If you only need the page number, use page() instead as it allows Typst to skip unnecessary work.

self.position() → dictionary
page-numbering
Returns the page numbering pattern of the page at this location. This can be used when displaying the page counter in order to obtain the local numbering. This is useful if you are building custom indices or outlines.

If the page numbering is set to none at that location, this function returns none.

self.page-numbering() → nonestrfunction
