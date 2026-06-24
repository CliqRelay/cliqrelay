ref
Element
A reference to a label or bibliography.

Takes a label and cross-references it. There are two kind of references, determined by its form: "normal" and "page".

The default, a "normal" reference, produces a textual reference to a label. For example, a reference to a heading will yield an appropriate string such as “Section 1” for a reference to the first heading. The word “Section” depends on the lang setting and is localized accordingly. The references are also links to the respective element. Reference syntax can also be used to cite from a bibliography.

As the default form requires a supplement and numbering, the label must be attached to a referenceable element. Referenceable elements include headings, figures, equations, and footnotes. To create a custom referenceable element like a theorem, you can create a figure of a custom kind and write a show rule for it. In the future, there might be a more direct way to define a custom referenceable element.

If you just want to link to a labelled element and not get an automatic textual reference, consider using the link function instead.

A "page" reference produces a page reference to a label, displaying the page number at its location. You can use the page’s supplement to modify the text before the page number. Unlike a "normal" reference, the label can be attached to any element as long as the corresponding page’s numbering is set.

Example
#set page(numbering: "1")
#set heading(numbering: "1.")
#set math.equation(numbering: "(1)")

= Introduction <intro>
Recent developments in
typesetting software have
rekindled hope in previously
frustrated researchers. @distress
As shown in @results (see
#ref(<results>, form: "page")),
we ...

= Results <results>
We discuss our approach in
comparison with others.

== Performance <perf>
@slow demonstrates what slow
software looks like.
$ T(n) = O(2^n) $ <slow>

#bibliography("works.bib")

Syntax
This function also has dedicated syntax: A "normal" reference to a label can be created by typing an @ followed by the name of the label (e.g. = Introduction <intro> can be referenced by typing @intro).

To customize the supplement, add content in square brackets after the reference: @intro[Chapter].

Customization
When you only ever need to reference pages of a figure/table/heading/etc. in a document, the default form field value can be changed to "page" with a set rule. If you prefer a short “p.” supplement over “page”, the page.supplement field can be used for changing this:

#set page(
numbering: "1",
supplement: "p.",
)
#set ref(form: "page")

#figure(
stack(
dir: ltr,
spacing: 1em,
circle(),
square(),
),
caption: [Shapes],
) <shapes>

#pagebreak()

See @shapes for examples
of different shapes.

If you write a show rule for references, you can access the referenced element through the element field of the reference. The element may be none even if it exists if Typst hasn’t discovered it yet, so you always need to handle that case in your code.

#set heading(numbering: "1.")
#set math.equation(numbering: "(1)")

#show ref: it => {
let eq = math.equation
let el = it.element
// Skip all other references.
if el == none or el.func() != eq { return it }
// Override equation references.
link(el.location(), counter(eq).display(at: el.location()))
}

= Beginnings <beginning>
In @beginning we prove @pythagoras.
$ a^2 + b^2 = c^2 $ <pythagoras>

Parameters
ref(
label,
supplement: noneautocontentfunction,
form: str,
) → content
target
label
Required
Positional
The target label that should be referenced.

Can be a label that is defined in the document or, if the form is set to "normal", an entry from the bibliography.

supplement
none or auto or content or function
Settable
Default: auto
A supplement for the reference.

If the form is set to "normal":

For references to headings or figures, this is added before the referenced number.
For citations, this can be used to add a page number.
If the form is set to "page", then this is added before the page number of the label referenced.

If a function is specified, it is passed the referenced element and should return content.

form
str
Settable
Default: "normal"
The kind of reference to produce.

Variant Details
"normal" Produces a textual reference to a label.
"page" Produces a page reference to a label.
