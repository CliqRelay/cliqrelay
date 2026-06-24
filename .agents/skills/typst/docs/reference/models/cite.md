cite
Element
Cite a work from the bibliography.

Before you starting citing, you need to add a bibliography somewhere in your document.

Example
This was already noted by
pirates long ago. @arrgh

Multiple sources say ...
@arrgh @netwok.

You can also call `cite`
explicitly. #cite(<arrgh>)

#bibliography("works.bib")

If your source name contains certain characters such as slashes, which are not recognized by the <> syntax, you can explicitly call label instead.

Computer Modern is an example of a modernist serif typeface.
#cite(label("DBLP:books/lib/Knuth86a")).

> > > #bibliography("works.bib")
> > > Syntax
> > > This function indirectly has dedicated syntax. References can be used to cite works from the bibliography. The label then corresponds to the citation key.

Parameters
cite(
label,
supplement: nonecontent,
form: nonestr,
style: autostrpathbytes,
) → content
key
label
Required
Positional
The citation key that identifies the entry in the bibliography that shall be cited, as a label.

supplement
none or content
Settable
Default: none
A supplement for the citation such as page or chapter number.

In reference syntax, the supplement can be added in square brackets:

form
none or str
Settable
Default: "normal"
The kind of citation to produce. Different forms are useful in different scenarios: A normal citation is useful as a source at the end of a sentence, while a “prose” citation is more suitable for inclusion in the flow of text.

If set to none, the cited work is included in the bibliography, but nothing will be displayed.

Variant Details
"normal" Display in the standard way for the active style.
"prose" Produces a citation that is suitable for inclusion in a sentence.
"full" Mimics a bibliography entry, with full information about the cited work.
"author" Shows only the cited work’s author(s).
"year" Shows only the cited work’s year.
style
auto or str or path or bytes
Settable
Default: auto
The citation style.

This can be:

auto to automatically use the bibliography’s style for citations.
A string with the name of one of the built-in styles (see below). Some of the styles listed below appear twice, once with their full name and once with a short alias.
A path string or path to a CSL file.
Raw bytes from which a CSL style should be decoded.
