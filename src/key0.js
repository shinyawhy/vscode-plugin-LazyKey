/**
 * 0 转 )
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled'))
    || !(vscode.workspace.getConfiguration().get('LazyKey.NumberToParentheses')))
    return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;
    
    // 倒序遍历每一个光标
    // 多个，有一个需要添加则进行添加
    var selections = editor.selections;
    let textEdits = [];
    var isAllSkip = true; // 是否全部跳过。有一个需要添加的则进行添加
    var canSkipIfAllSkip = true;
    for (var i = selections.length - 1; i >= 0; --i) {
        // 获取全文和当前行内容
        position = selections[i].end;
        var full = document.getText();
        var leftPosition = new vscode.Position(position.line, position.character - 1);   // 左边单词右位置
        var word = document.getText(document.getWordRangeAtPosition(leftPosition));  // 点号左边的单词
        var line = document.lineAt(position).text;
        var inpt = line.substring(position.character - 1, position.character);
        var left = line.substring(0, leftPosition.character);
        var right = line.substring(position.character);

        // 判断左1是不是输入的符号
        if (inpt != "0")
            return;

        // 不处理连续数字
        if (/\d+$/.test(left) || /^\d+/.test(right))
            return;

        // 光标左右的左右括号的数量
        var ll = 0, lr = 0, rl = 0, rr = 0;
        for (var j = 0; j < left.length; j++) {
            var c = left.charAt(j);
            if (c == '(')
                ll++;
            else if (c == ')')
                lr++;
        }
        for (var j = 0; j < right.length; j++) {
            var c = right.charAt(j);
            if (c == '(')
                rl++;
            else if (c == ')')
                rr++;
        }

        // 如果左右括号已经匹配了，则跳过
        var isSkip = (ll+rl <= lr+rr);
        if (!isSkip) { // 有添加的部分，则执行添加
            isAllSkip = false;
        } else if (right.length==0 || right.substring(0, 1) != ")") {
            canSkipIfAllSkip = false;
        }

        // 点号的位置替换为指针
        var newEdit = vscode.TextEdit.replace(new vscode.Range(leftPosition, position), ")");

        // 添加本次的修改
        textEdits.push(newEdit);
    }

    // 应用到编辑器
    if (!isAllSkip) { // 只要有需要添加的，就进行添加
        let wordspaceEdit = new vscode.WorkspaceEdit();
        wordspaceEdit.set(document.uri, textEdits);
        vscode.workspace.applyEdit(wordspaceEdit);
    } else if (canSkipIfAllSkip) { // 全部跳过，并且是全能跳过的，光标右移1
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorRight');
    }
}

/**
 * 光标选中当前自动补全item时触发动作，一般情况下无需处理
 * @param {*} item
 * @param {*} token
 */
function resolveCompletionItem(item, token) {
    return null;
}

module.exports = function (context) {
    // 注册代码建议提示，只有当按下“.”时才触发
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', languages: ['c', 'cpp', 'php', 'java', 'js', 'cs', 'python', 'jsp'] }, {
            provideCompletionItems,
            resolveCompletionItem
        }, '0'));
};