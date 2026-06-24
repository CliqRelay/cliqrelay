Typed HTML
A typed layer over raw HTML elements.

The html module provides a typed layer over the raw html.elem function that allows you to conveniently create HTML elements. HTML attributes are exposed as function parameters that accept Typst types and automatically take care of converting those into the appropriate HTML.

Some parameters are common to all typed HTML functions. These are listed at the bottom in the Global Attributes section instead of explicitly on each element for readability.

Example
#html.video(
controls: true,
width: 1280,
height: 720,
src: "sunrise.mp4",
)[
Your browser does not support the video tag.
]
Functions
a
Hyperlink.

html.a(
download: str,
href: str,
hreflang: str,
ping: strarray,
referrerpolicy: nonestr,
rel: strarray,
target: str,
type: str,
content,
) → content
download
str
Whether to download the resource instead of navigating to it, and its filename if so.

href
str
Address of the hyperlink.

hreflang
str
Language of the linked resource.

ping
str or array
URLs to ping.

referrerpolicy
none or str
Referrer policy for fetches initiated by the element.

Variant Details
"no-referrer"
"no-referrer-when-downgrade"
"same-origin"
"origin"
"strict-origin"
"origin-when-cross-origin"
"strict-origin-when-cross-origin"
"unsafe-url"
rel
str or array
Relationship between the location in the document containing the hyperlink and the destination resource.

target
str
Navigable for hyperlink navigation.

Variant Details
"\_blank"
"\_self"
"\_parent"
"\_top"
type
str
Hint for the type of the referenced resource.

body
content
Positional
The contents of the HTML element.

abbr
Abbreviation.

html.abbr(
content
) → content
body
content
Positional
The contents of the HTML element.

address
Contact information for a page or article element.

html.address(
content
) → content
body
content
Positional
The contents of the HTML element.

area
Hyperlink or dead area on an image map.

html.area(
alt: str,
coords: array,
download: str,
href: str,
ping: strarray,
referrerpolicy: nonestr,
rel: strarray,
shape: str,
target: str,
) → content
alt
str
Replacement text for use when images are not available.

coords
array
Coordinates for the shape to be created in an image map. Expects an array of floating point numbers.

download
str
Whether to download the resource instead of navigating to it, and its filename if so.

href
str
Address of the hyperlink.

ping
str or array
URLs to ping.

referrerpolicy
none or str
Referrer policy for fetches initiated by the element.

Variant Details
"no-referrer"
"no-referrer-when-downgrade"
"same-origin"
"origin"
"strict-origin"
"origin-when-cross-origin"
"strict-origin-when-cross-origin"
"unsafe-url"
rel
str or array
Relationship between the location in the document containing the hyperlink and the destination resource.

shape
str
The kind of shape to be created in an image map.

Variant Details
"circle"
"default"
"poly"
"rect"
target
str
Navigable for hyperlink navigation.

Variant Details
"\_blank"
"\_self"
"\_parent"
"\_top"
article
Self-contained syndicatable or reusable composition.

html.article(
content
) → content
body
content
Positional
The contents of the HTML element.

aside
Sidebar for tangentially related content.

html.aside(
content
) → content
body
content
Positional
The contents of the HTML element.

audio
Audio player.

html.audio(
autoplay: bool,
controls: bool,
crossorigin: str,
loop: bool,
muted: bool,
preload: noneautostr,
src: str,
content,
) → content
autoplay
bool
Hint that the media resource can be started automatically when the page is loaded.

controls
bool
Show user agent controls.

crossorigin
str
How the element handles crossorigin requests.

Variant Details
"anonymous"
"use-credentials"
loop
bool
Whether to loop the media resource.

muted
bool
Whether to mute the media resource by default.

preload
none or auto or str
Hints how much buffering the media resource will likely need.

Variant Details
"metadata"
src
str
Address of the resource.

body
content
Positional
The contents of the HTML element.

b
Keywords.

html.b(
content
) → content
body
content
Positional
The contents of the HTML element.

base
Base URL and default target navigable for hyperlinks and forms.

html.base(
href: str,
target: str,
) → content
href
str
Document base URL.

target
str
Default navigable for hyperlink navigation and form submission.

Variant Details
"\_blank"
"\_self"
"\_parent"
"\_top"
bdi
Text directionality isolation.

html.bdi(
content
) → content
body
content
Positional
The contents of the HTML element.

bdo
Text directionality formatting.

html.bdo(
content
) → content
body
content
Positional
The contents of the HTML element.

blockquote
A section quoted from another source.

html.blockquote(
cite: str,
content,
) → content
cite
str
Link to the source of the quotation or more information about the edit.

body
content
Positional
The contents of the HTML element.

body
Document body.

html.body(
content
) → content
body
content
Positional
The contents of the HTML element.

br
Line break, e.g. in poem or postal address.

html.br() → content
button
Button control.

html.button(
command: str,
commandfor: str,
disabled: bool,
form: str,
formaction: str,
formenctype: str,
formmethod: str,
formnovalidate: bool,
formtarget: str,
name: str,
popovertarget: str,
popovertargetaction: str,
type: str,
value: str,
content,
) → content
command
str
Indicates to the targeted element which action to take.

Variant Details
"toggle-popover"
"show-popover"
"hide-popover"
"close"
"request-close"
"show-modal"
commandfor
str
Targets another element to be invoked.

disabled
bool
Whether the form control is disabled.

form
str
Associates the element with a form element.

formaction
str
URL to use for form submission.

formenctype
str
Entry list encoding type to use for form submission.

Variant Details
"application/x-www-form-urlencoded"
"multipart/form-data"
"text/plain"
formmethod
str
Variant to use for form submission.

Variant Details
"GET"
"POST"
"dialog"
formnovalidate
bool
Bypass form control validation for form submission.

formtarget
str
Navigable for form submission.

Variant Details
"\_blank"
"\_self"
"\_parent"
"\_top"
name
str
Name of the element to use for form submission and in the form.elements API.

popovertarget
str
Targets a popover element to toggle, show, or hide.

popovertargetaction
str
Indicates whether a targeted popover element is to be toggled, shown, or hidden.

Variant Details
"toggle"
"show"
"hide"
type
str
Type of button.

Variant Details
"submit"
"reset"
"button"
value
str
Value to be used for form submission.

body
content
Positional
The contents of the HTML element.

canvas
Scriptable bitmap canvas.

html.canvas(
height: int,
width: int,
content,
) → content
height
int
Vertical dimension.

width
int
Horizontal dimension.

body
content
Positional
The contents of the HTML element.

caption
Table caption.

html.caption(
content
) → content
body
content
Positional
The contents of the HTML element.

cite
Title of a work.

html.cite(
content
) → content
body
content
Positional
The contents of the HTML element.

code
Computer code.

html.code(
content
) → content
body
content
Positional
The contents of the HTML element.

col
Table column.

html.col(
span
:
int
) → content
span
int
Number of columns spanned by the element.

colgroup
Group of columns in a table.

html.colgroup(
span: int,
content,
) → content
span
int
Number of columns spanned by the element.

body
content
Positional
The contents of the HTML element.

data
Machine-readable equivalent.

html.data(
value: str,
content,
) → content
value
str
Machine-readable value.

body
content
Positional
The contents of the HTML element.

datalist
Container for options for combo box control.

html.datalist(
content
) → content
body
content
Positional
The contents of the HTML element.

dd
Content for corresponding dt element(s).

html.dd(
content
) → content
body
content
Positional
The contents of the HTML element.

del
A removal from the document.

html.del(
cite: str,
datetime: datetime,
content,
) → content
cite
str
Link to the source of the quotation or more information about the edit.

datetime
datetime
Date and (optionally) time of the change.

body
content
Positional
The contents of the HTML element.

details
Disclosure control for hiding details.

html.details(
name: str,
open: bool,
content,
) → content
name
str
Name of group of mutually-exclusive details elements.

open
bool
Whether the details are visible.

body
content
Positional
The contents of the HTML element.

dfn
Defining instance.

html.dfn(
content
) → content
body
content
Positional
The contents of the HTML element.

dialog
Dialog box or window.

html.dialog(
open: bool,
content,
) → content
open
bool
Whether the dialog box is showing.

body
content
Positional
The contents of the HTML element.

div
Generic flow container, or container for name-value groups in dl elements.

html.div(
content
) → content
body
content
Positional
The contents of the HTML element.

dl
Association list consisting of zero or more name-value groups.

html.dl(
content
) → content
body
content
Positional
The contents of the HTML element.

dt
Legend for corresponding dd element(s).

html.dt(
content
) → content
body
content
Positional
The contents of the HTML element.

em
Stress emphasis.

html.em(
content
) → content
body
content
Positional
The contents of the HTML element.

embed
Plugin.

html.embed(
height: int,
src: str,
type: str,
width: int,
) → content
height
int
Vertical dimension.

src
str
Address of the resource.

type
str
Type of embedded resource.

width
int
Horizontal dimension.

fieldset
Group of form controls.

html.fieldset(
disabled: bool,
form: str,
name: str,
content,
) → content
disabled
bool
Whether the descendant form controls, except any inside legend, are disabled.

form
str
Associates the element with a form element.

name
str
Name of the element to use for form submission and in the form.elements API.

body
content
Positional
The contents of the HTML element.

figcaption
Caption for figure.

html.figcaption(
content
) → content
body
content
Positional
The contents of the HTML element.

figure
Figure with optional caption.

html.figure(
content
) → content
body
content
Positional
The contents of the HTML element.

footer
Footer for a page or section.

html.footer(
content
) → content
body
content
Positional
The contents of the HTML element.

form
User-submittable form.

html.form(
accept-charset: str,
action: str,
autocomplete: bool,
enctype: str,
method: str,
name: str,
novalidate: bool,
rel: strarray,
target: str,
content,
) → content
accept-charset
str
Character encodings to use for form submission.

Variant Details
"utf-8"
action
str
URL to use for form submission.

autocomplete
bool
Default setting for autofill feature for controls in the form.

enctype
str
Entry list encoding type to use for form submission.

Variant Details
"application/x-www-form-urlencoded"
"multipart/form-data"
"text/plain"
method
str
Variant to use for form submission.

Variant Details
"GET"
"POST"
"dialog"
name
str
Name of form to use in the document.forms API.

novalidate
bool
Bypass form control validation for form submission.

rel
str or array
Relationship between the document containing the form and its action destination

target
str
Navigable for form submission.

Variant Details
"\_blank"
"\_self"
"\_parent"
"\_top"
body
content
Positional
The contents of the HTML element.

h1
Heading.

html.h1(
content
) → content
body
content
Positional
The contents of the HTML element.

h2
Heading.

html.h2(
content
) → content
body
content
Positional
The contents of the HTML element.

h3
Heading.

html.h3(
content
) → content
body
content
Positional
The contents of the HTML element.

h4
Heading.

html.h4(
content
) → content
body
content
Positional
The contents of the HTML element.

h5
Heading.

html.h5(
content
) → content
body
content
Positional
The contents of the HTML element.

h6
Heading.

html.h6(
content
) → content
body
content
Positional
The contents of the HTML element.

head
Container for document metadata.

html.head(
content
) → content
body
content
Positional
The contents of the HTML element.

header
Introductory or navigational aids for a page or section.

html.header(
content
) → content
body
content
Positional
The contents of the HTML element.

hgroup
Heading container.

html.hgroup(
content
) → content
body
content
Positional
The contents of the HTML element.

hr
Thematic break.

html.hr() → content
html
Root element.

html.html(
content
) → content
body
content
Positional
The contents of the HTML element.

i
Alternate voice.

html.i(
content
) → content
body
content
Positional
The contents of the HTML element.

iframe
Child navigable.

html.iframe(
allow: str,
allowfullscreen: bool,
height: int,
loading: str,
name: str,
referrerpolicy: nonestr,
sandbox: strarray,
src: str,
srcdoc: str,
width: int,
content,
) → content
allow
str
Permissions policy to be applied to the iframe’s contents.

allowfullscreen
bool
Whether to allow the iframe’s contents to use requestFullscreen().

height
int
Vertical dimension.

loading
str
Used when determining loading deferral.

Variant Details
"lazy"
"eager"
name
str
Name of content navigable.

Variant Details
"\_blank"
"\_self"
"\_parent"
"\_top"
referrerpolicy
none or str
Referrer policy for fetches initiated by the element.

Variant Details
"no-referrer"
"no-referrer-when-downgrade"
"same-origin"
"origin"
"strict-origin"
"origin-when-cross-origin"
"strict-origin-when-cross-origin"
"unsafe-url"
sandbox
str or array
Security rules for nested content.

src
str
Address of the resource.

srcdoc
str
A document to render in the iframe.

width
int
Horizontal dimension.

body
content
Positional
The contents of the HTML element.

img
Image.

html.img(
alt: str,
crossorigin: str,
decoding: autostr,
fetchpriority: autostr,
height: int,
ismap: bool,
loading: str,
referrerpolicy: nonestr,
sizes: array,
src: str,
srcset: array,
usemap: str,
width: int,
) → content
alt
str
Replacement text for use when images are not available.

crossorigin
str
How the element handles crossorigin requests.

Variant Details
"anonymous"
"use-credentials"
decoding
auto or str
Decoding hint to use when processing this image for presentation.

Variant Details
"sync"
"async"
fetchpriority
auto or str
Sets the priority for fetches initiated by the element.

Variant Details
"high"
"low"
height
int
Vertical dimension.

ismap
bool
Whether the image is a server-side image map.

loading
str
Used when determining loading deferral.

Variant Details
"lazy"
"eager"
referrerpolicy
none or str
Referrer policy for fetches initiated by the element.

Variant Details
"no-referrer"
"no-referrer-when-downgrade"
"same-origin"
"origin"
"strict-origin"
"origin-when-cross-origin"
"strict-origin-when-cross-origin"
"unsafe-url"
sizes
array
Image sizes for different page layouts. Expects an array of dictionaries with the keys condition (string) and size (length).

src
str
Address of the resource.

srcset
array
Images to use in different situations, e.g., high-resolution displays, small monitors, etc. Expects an array of dictionaries with the keys src (string) and width (integer) or density (float).

usemap
str
Name of image map to use.

width
int
Horizontal dimension.

input
Form control.

html.input(
accept: strarray,
alpha: bool,
alt: str,
autocomplete: strarray,
checked: bool,
colorspace: str,
dirname: str,
disabled: bool,
form: str,
formaction: str,
formenctype: str,
formmethod: str,
formnovalidate: bool,
formtarget: str,
height: int,
list: str,
max: floatdatetimestr,
maxlength: int,
min: floatdatetimestr,
minlength: int,
multiple: bool,
name: str,
pattern: str,
placeholder: str,
popovertarget: str,
popovertargetaction: str,
readonly: bool,
required: bool,
size: int,
src: str,
step: floatstr,
type: str,
value: floatcolordatetimestrarray,
width: int,
) → content
accept
str or array
Hint for expected file type in file upload controls.

alpha
bool
Allow the color’s alpha component to be set.

alt
str
Replacement text for use when images are not available.

autocomplete
str or array
Hint for form autofill feature.

checked
bool
Whether the control is checked.

colorspace
str
The color space of the serialized color.

Variant Details
"limited-srgb"
"display-p3"
dirname
str
Name of form control to use for sending the element’s directionality in form submission.

disabled
bool
Whether the form control is disabled.

form
str
Associates the element with a form element.

formaction
str
URL to use for form submission.

formenctype
str
Entry list encoding type to use for form submission.

Variant Details
"application/x-www-form-urlencoded"
"multipart/form-data"
"text/plain"
formmethod
str
Variant to use for form submission.

Variant Details
"GET"
"POST"
"dialog"
formnovalidate
bool
Bypass form control validation for form submission.

formtarget
str
Navigable for form submission.

Variant Details
"\_blank"
"\_self"
"\_parent"
"\_top"
height
int
Vertical dimension.

list
str
List of autocomplete options.

max
float or datetime or str
Maximum value.

maxlength
int
Maximum length of value.

min
float or datetime or str
Minimum value.

minlength
int
Minimum length of value.

multiple
bool
Whether to allow multiple values.

name
str
Name of the element to use for form submission and in the form.elements API.

pattern
str
Pattern to be matched by the form control’s value.

placeholder
str
User-visible label to be placed within the form control.

popovertarget
str
Targets a popover element to toggle, show, or hide.

popovertargetaction
str
Indicates whether a targeted popover element is to be toggled, shown, or hidden.

Variant Details
"toggle"
"show"
"hide"
readonly
bool
Whether to allow the value to be edited by the user.

required
bool
Whether the control is required for form submission.

size
int
Size of the control.

src
str
Address of the resource.

step
float or str
Granularity to be matched by the form control’s value.

Variant Details
"any"
type
str
Type of form control.

value
float or color or datetime or str or array
Value of the form control.

width
int
Horizontal dimension.

ins
An addition to the document.

html.ins(
cite: str,
datetime: datetime,
content,
) → content
cite
str
Link to the source of the quotation or more information about the edit.

datetime
datetime
Date and (optionally) time of the change.

body
content
Positional
The contents of the HTML element.

kbd
User input.

html.kbd(
content
) → content
body
content
Positional
The contents of the HTML element.

label
Caption for a form control.

html.label(
for: str,
content,
) → content
for
str
Associate the label with form control.

body
content
Positional
The contents of the HTML element.

legend
Caption for fieldset.

html.legend(
content
) → content
body
content
Positional
The contents of the HTML element.

li
List item.

html.li(
value: int,
content,
) → content
value
int
Ordinal value of the list item.

body
content
Positional
The contents of the HTML element.

link
Link metadata.

html.link(
as: str,
blocking: strarray,
color: color,
crossorigin: str,
disabled: bool,
fetchpriority: autostr,
href: str,
hreflang: str,
imagesizes: array,
imagesrcset: array,
integrity: str,
media: str,
referrerpolicy: nonestr,
rel: strarray,
sizes: array,
type: str,
) → content
as
str
Potential destination for a preload request (for rel=“preload” and rel=“modulepreload”).

blocking
str or array
Whether the element is potentially render-blocking.

Variant Details
"blocking"
color
color
Color to use when customizing a site’s icon (for rel=“mask-icon”).

crossorigin
str
How the element handles crossorigin requests.

Variant Details
"anonymous"
"use-credentials"
disabled
bool
Whether the link is disabled.

fetchpriority
auto or str
Sets the priority for fetches initiated by the element.

Variant Details
"high"
"low"
href
str
Address of the hyperlink.

hreflang
str
Language of the linked resource.

imagesizes
array
Image sizes for different page layouts (for rel=“preload”). Expects an array of dictionaries with the keys condition (string) and size (length).

imagesrcset
array
Images to use in different situations, e.g., high-resolution displays, small monitors, etc. (for rel=“preload”). Expects an array of dictionaries with the keys src (string) and width (integer) or density (float).

integrity
str
Integrity metadata used in Subresource Integrity checks.

media
str
Applicable media.

referrerpolicy
none or str
Referrer policy for fetches initiated by the element.

Variant Details
"no-referrer"
"no-referrer-when-downgrade"
"same-origin"
"origin"
"strict-origin"
"origin-when-cross-origin"
"strict-origin-when-cross-origin"
"unsafe-url"
rel
str or array
Relationship between the document containing the hyperlink and the destination resource.

sizes
array
Sizes of the icons (for rel=“icon”). Expects an array of sizes. Each size is specified as an array of two integers (width and height).

type
str
Hint for the type of the referenced resource.

main
Container for the dominant contents of the document.

html.main(
content
) → content
body
content
Positional
The contents of the HTML element.

map
Image map.

html.map(
name: str,
content,
) → content
name
str
Name of image map to reference from the usemap attribute.

body
content
Positional
The contents of the HTML element.

mark
Highlight.

html.mark(
content
) → content
body
content
Positional
The contents of the HTML element.

menu
Menu of commands.

html.menu(
content
) → content
body
content
Positional
The contents of the HTML element.

meta
Text metadata.

html.meta(
charset: str,
content: str,
http-equiv: str,
media: str,
name: str,
) → content
charset
str
Character encoding declaration.

Variant Details
"utf-8"
content
str
Value of the element.

http-equiv
str
Pragma directive.

Variant Details
"content-type"
"default-style"
"refresh"
"x-ua-compatible"
"content-security-policy"
media
str
Applicable media.

name
str
Metadata name.

meter
Gauge.

html.meter(
high: float,
low: float,
max: float,
min: float,
optimum: float,
value: float,
content,
) → content
high
float
Low limit of high range.

low
float
High limit of low range.

max
float
Upper bound of range.

min
float
Lower bound of range.

optimum
float
Optimum value in gauge.

value
float
Current value of the element.

body
content
Positional
The contents of the HTML element.

nav
Section with navigational links.

html.nav(
content
) → content
body
content
Positional
The contents of the HTML element.

noscript
Fallback content for script.

html.noscript(
content
) → content
body
content
Positional
The contents of the HTML element.

object
Image, child navigable, or plugin.

html.object(
data: str,
form: str,
height: int,
name: str,
type: str,
width: int,
content,
) → content
data
str
Address of the resource.

form
str
Associates the element with a form element.

height
int
Vertical dimension.

name
str
Name of content navigable.

Variant Details
"\_blank"
"\_self"
"\_parent"
"\_top"
type
str
Type of embedded resource.

width
int
Horizontal dimension.

body
content
Positional
The contents of the HTML element.

ol
Ordered list.

html.ol(
reversed: bool,
start: int,
type: str,
content,
) → content
reversed
bool
Number the list backwards.

start
int
Starting value of the list.

type
str
Kind of list marker.

Variant Details
"1"
"a"
"A"
"i"
"I"
body
content
Positional
The contents of the HTML element.

optgroup
Group of options in a list box.

html.optgroup(
disabled: bool,
label: str,
content,
) → content
disabled
bool
Whether the form control is disabled.

label
str
User-visible label.

body
content
Positional
The contents of the HTML element.

option
Option in a list box or combo box control.

html.option(
disabled: bool,
label: str,
selected: bool,
value: str,
content,
) → content
disabled
bool
Whether the form control is disabled.

label
str
User-visible label.

selected
bool
Whether the option is selected by default.

value
str
Value to be used for form submission.

body
content
Positional
The contents of the HTML element.

output
Calculated output value.

html.output(
for: strarray,
form: str,
name: str,
content,
) → content
for
str or array
Specifies controls from which the output was calculated.

form
str
Associates the element with a form element.

name
str
Name of the element to use for form submission and in the form.elements API.

body
content
Positional
The contents of the HTML element.

p
Paragraph.

html.p(
content
) → content
body
content
Positional
The contents of the HTML element.

picture
Image.

html.picture(
content
) → content
body
content
Positional
The contents of the HTML element.

pre
Block of preformatted text.

html.pre(
content
) → content
body
content
Positional
The contents of the HTML element.

progress
Progress bar.

html.progress(
max: float,
value: float,
content,
) → content
max
float
Upper bound of range.

value
float
Current value of the element.

body
content
Positional
The contents of the HTML element.

q
Quotation.

html.q(
cite: str,
content,
) → content
cite
str
Link to the source of the quotation or more information about the edit.

body
content
Positional
The contents of the HTML element.

rp
Parenthesis for ruby annotation text.

html.rp(
content
) → content
body
content
Positional
The contents of the HTML element.

rt
Ruby annotation text.

html.rt(
content
) → content
body
content
Positional
The contents of the HTML element.

ruby
Ruby annotation(s).

html.ruby(
content
) → content
body
content
Positional
The contents of the HTML element.

s
Inaccurate text.

html.s(
content
) → content
body
content
Positional
The contents of the HTML element.

samp
Computer output.

html.samp(
content
) → content
body
content
Positional
The contents of the HTML element.

script
Embedded script.

html.script(
async: bool,
blocking: strarray,
crossorigin: str,
defer: bool,
fetchpriority: autostr,
integrity: str,
nomodule: bool,
referrerpolicy: nonestr,
src: str,
type: str,
str,
) → content
async
bool
Execute script when available, without blocking while fetching.

blocking
str or array
Whether the element is potentially render-blocking.

Variant Details
"blocking"
crossorigin
str
How the element handles crossorigin requests.

Variant Details
"anonymous"
"use-credentials"
defer
bool
Defer script execution.

fetchpriority
auto or str
Sets the priority for fetches initiated by the element.

Variant Details
"high"
"low"
integrity
str
Integrity metadata used in Subresource Integrity checks.

nomodule
bool
Prevents execution in user agents that support module scripts.

referrerpolicy
none or str
Referrer policy for fetches initiated by the element.

Variant Details
"no-referrer"
"no-referrer-when-downgrade"
"same-origin"
"origin"
"strict-origin"
"origin-when-cross-origin"
"strict-origin-when-cross-origin"
"unsafe-url"
src
str
Address of the resource.

type
str
Type of script.

Variant Details
"module"
body
str
Positional
The text content of the HTML element.

search
Container for search controls.

html.search(
content
) → content
body
content
Positional
The contents of the HTML element.

section
Generic document or application section.

html.section(
content
) → content
body
content
Positional
The contents of the HTML element.

select
List box control.

html.select(
autocomplete: strarray,
disabled: bool,
form: str,
multiple: bool,
name: str,
required: bool,
size: int,
content,
) → content
autocomplete
str or array
Hint for form autofill feature.

disabled
bool
Whether the form control is disabled.

form
str
Associates the element with a form element.

multiple
bool
Whether to allow multiple values.

name
str
Name of the element to use for form submission and in the form.elements API.

required
bool
Whether the control is required for form submission.

size
int
Size of the control.

body
content
Positional
The contents of the HTML element.

slot
Shadow tree slot.

html.slot(
name: str,
content,
) → content
name
str
Name of shadow tree slot.

body
content
Positional
The contents of the HTML element.

small
Side comment.

html.small(
content
) → content
body
content
Positional
The contents of the HTML element.

source
Image source for img or media source for video or audio.

html.source(
height: int,
media: str,
sizes: array,
src: str,
srcset: array,
type: str,
width: int,
) → content
height
int
Vertical dimension.

media
str
Applicable media.

sizes
array
Image sizes for different page layouts. Expects an array of dictionaries with the keys condition (string) and size (length).

src
str
Address of the resource.

srcset
array
Images to use in different situations, e.g., high-resolution displays, small monitors, etc. Expects an array of dictionaries with the keys src (string) and width (integer) or density (float).

type
str
Type of embedded resource.

width
int
Horizontal dimension.

span
Generic phrasing container.

html.span(
content
) → content
body
content
Positional
The contents of the HTML element.

strong
Importance.

html.strong(
content
) → content
body
content
Positional
The contents of the HTML element.

style
Embedded styling information.

html.style(
blocking: strarray,
media: str,
str,
) → content
blocking
str or array
Whether the element is potentially render-blocking.

Variant Details
"blocking"
media
str
Applicable media.

body
str
Positional
The text content of the HTML element.

sub
Subscript.

html.sub(
content
) → content
body
content
Positional
The contents of the HTML element.

summary
Caption for details.

html.summary(
content
) → content
body
content
Positional
The contents of the HTML element.

sup
Superscript.

html.sup(
content
) → content
body
content
Positional
The contents of the HTML element.

table
Table.

html.table(
content
) → content
body
content
Positional
The contents of the HTML element.

tbody
Group of rows in a table.

html.tbody(
content
) → content
body
content
Positional
The contents of the HTML element.

td
Table cell.

html.td(
colspan: int,
headers: strarray,
rowspan: int,
content,
) → content
colspan
int
Number of columns that the cell is to span.

headers
str or array
The header cells for this cell.

rowspan
int
Number of rows that the cell is to span.

body
content
Positional
The contents of the HTML element.

template
Template.

html.template(
shadowrootclonable: bool,
shadowrootcustomelementregistry: bool,
shadowrootdelegatesfocus: bool,
shadowrootmode: str,
shadowrootserializable: bool,
content,
) → content
shadowrootclonable
bool
Sets clonable on a declarative shadow root.

shadowrootcustomelementregistry
bool
Enables declarative shadow roots to indicate they will use a custom element registry.

shadowrootdelegatesfocus
bool
Sets delegates focus on a declarative shadow root.

shadowrootmode
str
Enables streaming declarative shadow roots.

Variant Details
"open"
"closed"
shadowrootserializable
bool
Sets serializable on a declarative shadow root.

body
content
Positional
The contents of the HTML element.

textarea
Multiline text controls.

html.textarea(
autocomplete: strarray,
cols: int,
dirname: str,
disabled: bool,
form: str,
maxlength: int,
minlength: int,
name: str,
placeholder: str,
readonly: bool,
required: bool,
rows: int,
wrap: str,
content,
) → content
autocomplete
str or array
Hint for form autofill feature.

cols
int
Maximum number of characters per line.

dirname
str
Name of form control to use for sending the element’s directionality in form submission.

disabled
bool
Whether the form control is disabled.

form
str
Associates the element with a form element.

maxlength
int
Maximum length of value.

minlength
int
Minimum length of value.

name
str
Name of the element to use for form submission and in the form.elements API.

placeholder
str
User-visible label to be placed within the form control.

readonly
bool
Whether to allow the value to be edited by the user.

required
bool
Whether the control is required for form submission.

rows
int
Number of lines to show.

wrap
str
How the value of the form control is to be wrapped for form submission.

Variant Details
"soft"
"hard"
body
content
Positional
The contents of the HTML element.

tfoot
Group of footer rows in a table.

html.tfoot(
content
) → content
body
content
Positional
The contents of the HTML element.

th
Table header cell.

html.th(
abbr: str,
colspan: int,
headers: strarray,
rowspan: int,
scope: str,
content,
) → content
abbr
str
Alternative label to use for the header cell when referencing the cell in other contexts.

colspan
int
Number of columns that the cell is to span.

headers
str or array
The header cells for this cell.

rowspan
int
Number of rows that the cell is to span.

scope
str
Specifies which cells the header cell applies to.

Variant Details
"row"
"col"
"rowgroup"
"colgroup"
body
content
Positional
The contents of the HTML element.

thead
Group of heading rows in a table.

html.thead(
content
) → content
body
content
Positional
The contents of the HTML element.

time
Machine-readable equivalent of date- or time-related data.

html.time(
datetime: datetimeduration,
content,
) → content
datetime
datetime or duration
Machine-readable value.

body
content
Positional
The contents of the HTML element.

title
Document title.

html.title(
content
) → content
body
content
Positional
The contents of the HTML element.

tr
Table row.

html.tr(
content
) → content
body
content
Positional
The contents of the HTML element.

track
Timed text track.

html.track(
default: bool,
kind: str,
label: str,
src: str,
srclang: str,
) → content
default
bool
Enable the track if no other text track is more suitable.

kind
str
The type of text track.

Variant Details
"subtitles"
"captions"
"descriptions"
"chapters"
"metadata"
label
str
User-visible label.

src
str
Address of the resource.

srclang
str
Language of the text track.

u
Unarticulated annotation.

html.u(
content
) → content
body
content
Positional
The contents of the HTML element.

ul
List.

html.ul(
content
) → content
body
content
Positional
The contents of the HTML element.

var
Variable.

html.var(
content
) → content
body
content
Positional
The contents of the HTML element.

video
Video player.

html.video(
autoplay: bool,
controls: bool,
crossorigin: str,
height: int,
loop: bool,
muted: bool,
playsinline: bool,
poster: str,
preload: noneautostr,
src: str,
width: int,
content,
) → content
autoplay
bool
Hint that the media resource can be started automatically when the page is loaded.

controls
bool
Show user agent controls.

crossorigin
str
How the element handles crossorigin requests.

Variant Details
"anonymous"
"use-credentials"
height
int
Vertical dimension.

loop
bool
Whether to loop the media resource.

muted
bool
Whether to mute the media resource by default.

playsinline
bool
Encourage the user agent to display video content within the element’s playback area.

poster
str
Poster frame to show prior to video playback.

preload
none or auto or str
Hints how much buffering the media resource will likely need.

Variant Details
"metadata"
src
str
Address of the resource.

width
int
Horizontal dimension.

body
content
Positional
The contents of the HTML element.

wbr
Line breaking opportunity.

html.wbr() → content
Global Attributes
These parameters are common to all typed HTML functions. They are listed here once instead of explicitly on each element for readability.

accesskey
str or array
Keyboard shortcut to activate or focus element. Expects a single-codepoint string or an array thereof.

aria-activedescendant
str
Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application.

aria-atomic
bool
Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute.

aria-autocomplete
none or str
Indicates whether inputting text could trigger display of one or more predictions of the user’s intended value for an input and specifies how predictions would be presented if they are made.

Variant Details
"inline" When a user is providing input, text suggesting one way to complete the provided input may be dynamically inserted after the caret.
"list" When a user is providing input, an element containing a collection of values that could complete the provided input may be displayed.
"both" When a user is providing input, an element containing a collection of values that could complete the provided input may be displayed. If displayed, one value in the collection is automatically selected, and the text needed to complete the automatically selected value appears after the caret in the input.
aria-busy
bool
Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user.

aria-checked
bool or str
Indicates the current “checked” state of checkboxes, radio buttons, and other widgets. See related aria-pressed and aria-selected.

Variant Details
"mixed" An intermediate value between true and false.
aria-colcount
int
Defines the total number of columns in a table, grid, or treegrid. See related aria-colindex.

aria-colindex
int
Defines an element’s column index or position with respect to the total number of columns within a table, grid, or treegrid. See related aria-colcount and aria-colspan.

aria-colspan
int
Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid. See related aria-colindex and aria-rowspan.

aria-controls
str or array
Identifies the element (or elements) whose contents or presence are controlled by the current element. See related aria-owns.

aria-current
bool or str
Indicates the element that represents the current item within a container or set of related elements.

Variant Details
"page" Represents the current page within a set of pages.
"step" Represents the current step within a process.
"location" Represents the current location within an environment or context.
"date" Represents the current date within a collection of dates.
"time" Represents the current time within a set of times.
aria-describedby
str or array
Identifies the element (or elements) that describes the object. See related aria-labelledby.

aria-details
str
Identifies the element that provides a detailed, extended description for the object. See related aria-describedby.

aria-disabled
bool
Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable. See related aria-hidden and aria-readonly.

aria-errormessage
str
Identifies the element that provides an error message for the object. See related aria-invalid and aria-describedby.

aria-expanded
none or bool
Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed.

aria-flowto
str or array
Identifies the next element (or elements) in an alternate reading order of content which, at the user’s discretion, allows assistive technology to override the general default of reading in document source order.

aria-haspopup
bool or str
Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element.

Variant Details
"menu" Indicates the popup is a menu.
"listbox" Indicates the popup is a listbox.
"tree" Indicates the popup is a tree.
"grid" Indicates the popup is a grid.
"dialog" Indicates the popup is a dialog.
aria-hidden
none or bool
Indicates whether the element is exposed to an accessibility API. See related aria-disabled.

aria-invalid
bool or str
Indicates the entered value does not conform to the format expected by the application. See related aria-errormessage.

Variant Details
"grammar" A grammatical error was detected.
"spelling" A spelling error was detected.
aria-keyshortcuts
str
Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element.

aria-label
str
Defines a string value that labels the current element. See related aria-labelledby.

aria-labelledby
str or array
Identifies the element (or elements) that labels the current element. See related aria-describedby.

aria-level
int
Defines the hierarchical level of an element within a structure.

aria-live
str
Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region.

Variant Details
"assertive" Indicates that updates to the region have the highest priority and should be presented the user immediately.
"off" Indicates that updates to the region should not be presented to the user unless the used is currently focused on that region.
"polite" Indicates that updates to the region should be presented at the next graceful opportunity, such as at the end of speaking the current sentence or when the user pauses typing.
aria-modal
bool
Indicates whether an element is modal when displayed.

aria-multiline
bool
Indicates whether a text box accepts multiple lines of input or only a single line.

aria-multiselectable
bool
Indicates that the user may select more than one item from the current selectable descendants.

aria-orientation
str
Indicates whether the element’s orientation is horizontal, vertical, or unknown/ambiguous.

Variant Details
"horizontal" The element is oriented horizontally.
"undefined" The element’s orientation is unknown/ambiguous.
"vertical" The element is oriented vertically.
aria-owns
str or array
Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship between DOM elements where the DOM hierarchy cannot be used to represent the relationship. See related aria-controls.

aria-placeholder
str
Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value. A hint could be a sample value or a brief description of the expected format.

aria-posinset
int
Defines an element’s number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. See related aria-setsize.

aria-pressed
bool or str
Indicates the current “pressed” state of toggle buttons. See related aria-checked and aria-selected.

Variant Details
"mixed" An intermediate value between true and false.
aria-readonly
bool
Indicates that the element is not editable, but is otherwise operable. See related aria-disabled.

aria-relevant
str or array
Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified. See related aria-atomic.

Variant Details
"additions" Element nodes are added to the accessibility tree within the live region.
"additions text" Equivalent to the combination of values, “additions text”.
"all" Equivalent to the combination of all values, “additions removals text”.
"removals" Text content, a text alternative, or an element node within the live region is removed from the accessibility tree.
"text" Text content or a text alternative is added to any descendant in the accessibility tree of the live region.
aria-required
bool
Indicates that user input is required on the element before a form may be submitted.

aria-roledescription
str
Defines a human-readable, author-localized description for the role of an element.

aria-rowcount
int
Defines the total number of rows in a table, grid, or treegrid. See related aria-rowindex.

aria-rowindex
int
Defines an element’s row index or position with respect to the total number of rows within a table, grid, or treegrid. See related aria-rowcount and aria-rowspan.

aria-rowspan
int
Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid. See related aria-rowindex and aria-colspan.

aria-selected
none or bool
Indicates the current “selected” state of various widgets. See related aria-checked and aria-pressed.

aria-setsize
int
Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. See related aria-posinset.

aria-sort
none or str
Indicates if items in a table or grid are sorted in ascending or descending order.

Variant Details
"ascending" Items are sorted in ascending order by this column.
"descending" Items are sorted in descending order by this column.
"other" A sort algorithm other than ascending or descending has been applied.
aria-valuemax
float
Defines the maximum allowed value for a range widget.

aria-valuemin
float
Defines the minimum allowed value for a range widget.

aria-valuenow
float
Defines the current value for a range widget. See related aria-valuetext.

aria-valuetext
str
Defines the human readable text alternative of aria-valuenow for a range widget.

autocapitalize
none or bool or str
Recommended autocapitalization behavior (for supported input methods).

Variant Details
"sentences"
"words"
"characters"
autocorrect
bool
Recommended autocorrection behavior (for supported input methods).

autofocus
bool
Automatically focus the element when the page is loaded.

class
str or array
Classes to which the element belongs.

contenteditable
bool or str
Whether the element is editable.

Variant Details
"plaintext-only"
dir
auto or direction
The text directionality of the element.

draggable
bool
Whether the element is draggable.

enterkeyhint
str
Hint for selecting an enter key action.

Variant Details
"enter"
"done"
"go"
"next"
"previous"
"search"
"send"
hidden
bool or str
Whether the element is relevant.

Variant Details
"until-found"
id
str
The element’s ID.

inert
bool
Whether the element is inert.

inputmode
none or str
Hint for selecting an input modality.

Variant Details
"text"
"tel"
"email"
"url"
"numeric"
"decimal"
"search"
is
str
Creates a customized built-in element.

itemid
str
Global identifier for a microdata item.

itemprop
str or array
Property names of a microdata item.

itemref
str or array
Referenced elements.

itemscope
bool
Introduces a microdata item.

itemtype
str or array
Item types of a microdata item.

lang
none or str
Language of the element.

nonce
str
Cryptographic nonce used in Content Security Policy checks.

popover
auto or str
Makes the element a popover element.

Variant Details
"manual"
role
none or str
An ARIA role.

slot
str
The element’s desired slot.

spellcheck
bool
Whether the element is to have its spelling and grammar checked.

style
str
Presentational and formatting instructions.

tabindex
int
Whether the element is focusable and sequentially focusable, and the relative order of the element for the purposes of sequential focus navigation.

title
str
Advisory information for the element.

translate
bool
Whether the element is to be translated when the page is localized.

writingsuggestions
bool
Whether the element can offer writing suggestions or not.
