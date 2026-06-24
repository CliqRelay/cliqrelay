bibliography
Element
A bibliography / reference listing.

You can create a new bibliography by calling this function with a path to a bibliography file in either one of two formats:

A Hayagriva .yaml/.yml file. Hayagriva is a new bibliography file format designed for use with Typst. Visit its documentation for more details.
A BibLaTeX .bib file.
As soon as you add a bibliography somewhere in your document, you can start citing things with reference syntax (@key) or explicit calls to the citation function (#cite(<key>)). The bibliography will only show entries for works that were referenced in the document.

Example
This was already noted by
pirates long ago. @arrgh

Multiple sources say ...
@arrgh @netwok.

#bibliography("works.bib")

Styles
Typst offers a wide selection of built-in citation and bibliography styles. Beyond those, you can add and use custom CSL (Citation Style Language) files. Wondering which style to use? Here are some good defaults based on what discipline you’re working in:

Fields Typical Styles
Engineering, IT "ieee"
Psychology, Life Sciences "apa"
Social sciences "chicago-author-date"
Humanities "mla", "chicago-notes", "harvard-cite-them-right"
Economics "harvard-cite-them-right"
Physics "american-physics-society"
Multiple bibliographies
When a Typst document contains multiple bibliographies, each citation is assigned to one of them. By default, Typst will automatically pick a suitable bibliography (typically, the closest following one that contains the referenced citation key). This covers common cases like by-chapter or thematic bibliographies. For more fine-grained control, citations can be explicitly targeted by a bibliography through a target selector.

Parameters
bibliography(
strpathbytesarray,
title: noneautocontent,
full: bool,
style: strpathbytes,
target: autolabelselectorlocationfunction,
group: noneautostr,
) → content
sources
str or path or bytes or array
Required
Positional
One or multiple paths to or raw bytes for Hayagriva .yaml and/or BibLaTeX .bib files.

This can be a:

A path string or path to load a bibliography file from.
Raw bytes from which the bibliography should be decoded.
An array where each item is one of the above.
title
none or auto or content
Settable
Default: auto
The title of the bibliography.

When set to auto, an appropriate title for the text language will be used. This is the default.
When set to none, the bibliography will not have a title.
A custom title can be set by passing content.
The bibliography’s heading will not be numbered by default, but you can force it to be with a show-set rule: show bibliography: set heading(numbering: "1.")

full
bool
Settable
Default: false
Whether to include all works from the given bibliography files, even those that weren’t cited in the document.

To selectively add individual cited works without showing them, you can also use the cite function with form set to none.

style
str or path or bytes
Settable
Default: "ieee"
The bibliography style.

This can be:

A string with the name of one of the built-in styles (see below). Some of the styles listed below appear twice, once with their full name and once with a short alias.
A path string or path to a CSL file.
Raw bytes from which a CSL style should be decoded.
target
auto or label or selector or location or function
Settable
Default: auto
Defines which citations to include in the bibliography.

Typst will automatically assign each citation in the document to a bibliography. Concretely, a citation will be assigned to (in order of precedence)

the first bibliography that includes it in its target selector; or if no such bibliography exists
the closest following bibliography with target: auto that contains its key; or if no such bibliography follows
the closest preceding bibliography with target: auto that contains its key.
group
none or auto or str
Settable
Default: auto
Conceptually groups this bibliography with other bibliographies for numbering purposes. Bibliographies in the same group will assign consecutive citation numbers.

This can be:

none: The bibliography will be numbered in isolation.
auto: The bibliography will be consecutively numbered with all other bibliographies in the auto group.
A string: The bibliography will be consecutively numbered with all other bibliographies with the same group value.
The auto group works just like any string group, but it is the canonical default group.
