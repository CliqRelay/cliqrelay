quote
Element
Displays a quote alongside an optional attribution.

Example
Plato is often misquoted as the author of #quote[I know that I know
nothing], however, this is a derivation form his original quote:

#set quote(block: true)

#quote(attribution: [Plato])[
... ἔοικα γοῦν τούτου γε σμικρῷ τινι αὐτῷ τούτῳ σοφώτερος εἶναι, ὅτι
ἃ μὴ οἶδα οὐδὲ οἴομαι εἰδέναι.
]
#quote(attribution: [from the Henry Cary literal translation of 1897])[
... I seem, then, in just this little thing to be wiser than this man at
any rate, that what I do not know I do not think I know either.
]

By default block quotes are padded left and right by 1em, alignment and padding can be controlled with show rules:

#set quote(block: true)
#show quote: set align(center)
#show quote: set pad(x: 5em)

#quote[
You cannot pass... I am a servant of the Secret Fire, wielder of the
flame of Anor. You cannot pass. The dark fire will not avail you,
flame of Udûn. Go back to the Shadow! You cannot pass.
]

Parameters
quote(
block: bool,
quotes: autobool,
attribution: nonelabelcontent,
content,
) → content
block
bool
Settable
Default: false
Whether this is a block quote.

quotes
auto or bool
Settable
Default: auto
Whether double quotes should be added around this quote.

The double quotes used are inferred from the quotes property on smartquote, which is affected by the lang property on text.

true: Wrap this quote in double quotes.
false: Do not wrap this quote in double quotes.
auto: Infer whether to wrap this quote in double quotes based on the block property. If block is false, double quotes are automatically added.
attribution
none or label or content
Settable
Default: none
The attribution of this quote, usually the author or source. Can be a label pointing to a bibliography entry or any content. By default only displayed for block quotes, but can be changed using a show rule.

body
content
Required
Positional
The quote.
