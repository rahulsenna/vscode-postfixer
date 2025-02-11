// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs'; // In NodeJS: 'const fs = require('fs')';
const yaml = require('js-yaml');

const path = require('path');

let config_file = "";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
//-----------------------------POSTFIX---------------------------------------------
let user_config: vscode.WorkspaceConfiguration;
let postfixes: any;
function init_fixes(): void
{
	user_config = vscode.workspace.getConfiguration('postfixer');
	postfixes = yaml.load(fs.readFileSync(config_file, 'utf8'));
	for (const scopes in postfixes) 
	{
		for (const scope of scopes.split(' '))
		{
			postfixes[scope] = postfixes[scopes];
		}
	}
}


const FIX_RE = /^(?<indent>\s*)(?<target>.+)\.(?<cmd>.+)$/g
const VAR_CURSOR = "$cursor"
const VAR_INDENT = /\$-->/g
const VAR_WHOLE = /\$0/g;

let indent_str = "\t"

interface Cursor {
	line: number;
	character: number;
}
interface Postfix {
	output: string;
	cursor: Cursor;
	line: boolean;
	replace_reg: string
}

function get_fix(fixes: any[], line: string): Postfix
{
	// let parsed_line = FIX_RE.exec(line);
	let parsed_line = [...line.matchAll(FIX_RE)][0];
	if (!parsed_line) { throw new Error("Postfixer: Could not parse line"); }
	// @ts-ignore
	let indent:string = parsed_line.groups.indent; let target:string = parsed_line.groups.target; let cmd:string    = parsed_line.groups.cmd;

	let fix = fixes.find(f => f.cmd == cmd);
	if (!fix) { throw new Error("no fix: " + cmd); }
	if (!fix['line'])
	{
		let match  = target.match(new RegExp(fix['target']+"$"));
		if (!match) { throw new Error("no match: " + target); }
		target = match[0];
	}

	let target_match = target.match(fix.target);
	if (!target_match) { throw new Error("Postfixer: No match for target: " + target); }
	fix.fix = fix.fix.replace(/\n$/, '');

	let parsed = fix.fix.replace(VAR_WHOLE, target_match[0])
	parsed = parsed.replace(VAR_INDENT, indent_str)

	if (target_match.length > 1) {
		target_match.forEach((match, index) => {
			parsed = parsed.replace(new RegExp("\\$" + index, "g"), match);
		});
	}

	let cursor: Cursor = {line: 0, character: 0};
	// @ts-ignore
	let output = parsed.split(/\r?\n/).map((line, index) => fix['line'] ? indent + line : line).join('\n');
	if (output.includes(VAR_CURSOR))
	{
		// @ts-ignore
		output.split(/\r?\n/).forEach((line, index) => 
		{
			if (line.includes(VAR_CURSOR)) {
				cursor.line = index; cursor.character = line.indexOf(VAR_CURSOR);
				if (!fix['line']) 
				{
					cursor.character = -line.split(VAR_CURSOR)[1].length;
				}
				return;
			};
		});
		output = output.replace(VAR_CURSOR, "");
	}
	else { cursor.character = output.length; }


	let result: Postfix = {output: output, cursor: cursor, line: fix['line'], replace_reg: fix['target'] + "\\.\\w+$"};
	return result;

}

export function activate(context: vscode.ExtensionContext) {
	const configPath = vscode.Uri.joinPath(context.globalStorageUri, 'config.yml');
	config_file = configPath.fsPath;
	try 
	{
        fs.accessSync(configPath.fsPath);
    } catch 
	{
        fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
        fs.copyFileSync(path.join(__dirname, '../docs/postfixes.yml'), configPath.fsPath);
    }

	init_fixes();

	let fix = vscode.commands.registerCommand('postfixer.fix', () => {
		
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }
		
		let cursor = editor.selection.active;
		let beg = new vscode.Position(editor.selection.active.line, 0);
		let range = new vscode.Range(beg, cursor);
		let text = editor.document.getText(range);

		let fix:Postfix;
		try {
			fix = get_fix(postfixes[editor.document.languageId], text);
		} catch (error: any) {
			// vscode.window.showErrorMessage(error.message);
			vscode.commands.executeCommand(user_config.fallback_command); // execute a normal tab command
			return;
		  }

		let replace_range: vscode.Range = range;
		if(!fix.line)
		{			
			let matched = text.match(new RegExp(fix.replace_reg));
			if (!matched) { return }
			let p2 =cursor.with(cursor.line, cursor.character-matched[0].length);
			replace_range = new vscode.Range(cursor,p2);
		}
		editor.edit(e => { 
			e.delete(replace_range);
			e.insert( replace_range.end, fix.output) 
		}).then(() => {
		let characters = fix.cursor.character;
		if (!fix.line) { characters += editor.selection.active.character; }
		
		var new_cursor = cursor.with(cursor.line + fix.cursor.line, characters);
		editor.selection = new vscode.Selection(new_cursor, new_cursor);
		});
	});
	context.subscriptions.push(fix);

	let reload = vscode.commands.registerCommand('postfixer.reload', () => {
		init_fixes();
	});
	context.subscriptions.push(reload);


	let edit = vscode.commands.registerCommand('postfixer.edit', () => {

		var snippets: vscode.Uri = vscode.Uri.file(config_file);
		vscode.workspace.openTextDocument(snippets).then((a: vscode.TextDocument) => {
			vscode.window.showTextDocument(a, 1, false)
		}, (error: any) => {

		});

		init_fixes();
	});
	context.subscriptions.push(edit);
}

// this method is called when your extension is deactivated
export function deactivate() { }
