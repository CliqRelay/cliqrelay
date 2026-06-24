xml
Reads structured data from an XML file.

The XML file is parsed into an array of dictionaries and strings. XML nodes can be elements or strings. Elements are represented as dictionaries with the following keys:

tag: The name of the element as a string.
attrs: A dictionary of the element’s attributes as strings.
children: An array of the element’s child nodes.
The XML file in the example contains a root news tag with multiple article tags. Each article has a title, author, and content tag. The content tag contains one or more paragraphs, which are represented as p tags.

Example
#let find-child(elem, tag) = {
elem.children
.find(e => "tag" in e and e.tag == tag)
}

#let article(elem) = {
let title = find-child(elem, "title")
let author = find-child(elem, "author")
let pars = find-child(elem, "content")

[= #title.children.first()]
text(10pt, weight: "medium")[
Published by
#author.children.first()
]

for p in pars.children {
if type(p) == dictionary {
parbreak()
p.children.first()
}
}
}

#let data = xml("example.xml")
#for elem in data.first().children {
if type(elem) == dictionary {
article(elem)
}
}

Parameters
xml(
str
path
bytes
) → any
source
str or path or bytes
Required
Positional
A path to an XML file or raw XML bytes.
