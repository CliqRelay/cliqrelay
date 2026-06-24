smartquote
Element
Element functions can be customized with set and show rules.
A language-aware quote that reacts to its context.

Automatically turns into an appropriate opening or closing quote based on the active text language.

Example
"This is in quotes."

#set text(lang: "de")
"Das ist in Anführungszeichen."

#set text(lang: "fr")
"C'est entre guillemets."

Syntax
This function also has dedicated syntax: The normal quote characters (' and "). Typst automatically makes your quotes smart.

Parameters
smartquote(
double: bool,
enabled: bool,
alternative: bool,
quotes: autostrarraydictionary,
) → content
double
bool
Settable
Default: true
Whether this should be a double quote.

enabled
bool
Settable
Default: true
Whether smart quotes are enabled.

To disable smartness for a single quote, you can also escape it with a backslash.

alternative
bool
Settable
Default: false
Whether to use alternative quotes.

Does nothing for languages that don’t have alternative quotes, or if explicit quotes were set.

quotes
auto or str or array or dictionary
Settable
Default: auto
The quotes to use.

When set to auto, the appropriate single quotes for the text language will be used. This is the default.
Custom quotes can be passed as a string, array, or dictionary of either

string: a string consisting of two characters containing the opening and closing double quotes (characters here refer to Unicode grapheme clusters)
array: an array containing the opening and closing double quotes
dictionary: a dictionary containing the double and single quotes, each specified as either auto, string, or array
