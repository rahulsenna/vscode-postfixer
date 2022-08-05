# Postfixer

Postfix completions plugin for VSCode.


## Usage examples

![python example](https://raw.githubusercontent.com/rahulsenna/vscode-postfixer/master/docs/py.gif)

![js example](https://raw.githubusercontent.com/rahulsenna/vscode-postfixer/master/docs/js.gif)


## Installation

### Setup
[Optional]: Set up a fallback function in settings in case there are no postfixes available.
For example, if you want to bind Postfix completions to TAB, and if postfixes are not available this will fall back to regular completion.
```json
    "postfixer.fallback_command": "autocomplete"

```
### Setup key binding

```json
    {
        "key": "tab",
        "command": "postfixer.fix",
    },
```


## Add language support

Easily add more languages by just editing snippet file 
```json
 "command": "postfixer.edit"
 ```



## License

MIT