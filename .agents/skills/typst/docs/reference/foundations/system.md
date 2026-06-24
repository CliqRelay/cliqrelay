System
Module for system interactions.

This module defines the following items:

The sys.version constant (of type version) that specifies the currently active Typst compiler version.

The sys.inputs dictionary, which makes external inputs available to the project. An input specified in the command line as --input key=value becomes available under sys.inputs.key as "value". To include spaces in the value, it may be enclosed with single or double quotes.

The value is always of type string. More complex data may be parsed manually using functions like json.
