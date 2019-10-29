/**
 * C++ 点号转指针
 *
 * 使用 WorkspaceEdit 而不是用 snippet 的原因是：
 * 转换后，不需要撤销两次还原
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled'))
        || !(vscode.workspace.getConfiguration().get('LazyKey.DotToPoint')))
        return;

    if (vscode.workspace.getConfiguration().get('LazyKey.DotToPointDisabledOnce')) {
        vscode.workspace.getConfiguration().update('LazyKey.DotToPointDisabledOnce', false, true);
        return;
    }
    if (['c', 'cpp', 'php'].indexOf(document.languageId) == -1)
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    // 倒序遍历每一个光标
    var selections = editor.selections;
    let textEdits = [];
    for (var i = selections.length-1; i>= 0; --i)
    {
        // 获取全文和当前行内容
        position = selections[i].end;
        var full = document.getText();
        var leftPosition = new vscode.Position(position.line, position.character - 1);   // 左边单词右位置
        var word = document.getText(document.getWordRangeAtPosition(leftPosition));  // 点号左边的单词
        var line = document.lineAt(position).text;
        var inpt = line.substring(position.character-1, position.character);
        var left = line.substring(0, leftPosition.character);
        var right = line.substring(position.character);

        // 判断左1是不是输入的符号
        if (inpt != ".")
            return ;

        var newText = "";
        // 指针变回点号
        if (left.endsWith('->')) {
            newText = ".";
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 2);
            vscode.workspace.getConfiguration().update('LazyKey.DotToPointDisabledOnce', true, true);
        }
        // 数字小数点
        else if (/\d$/.test(left)) {
            return;
        }
        else {
            newText = "->";
            // 两个点号变成指针
            var doublePoint = false;
            if (left.length >= 2 && left.endsWith('.')) {
                if (left.endsWith("..") || left.endsWith("\t.")) // 三个点或开头两点，不知道什么情况，退出
                    return;
                if (left.endsWith(" .")) // 针对可变参数数组的情况 ...
                    return;
                // 剩下就是一个点的情况，加上输入的一共是两个点
                leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
                word = document.getText(document.getWordRangeAtPosition(leftPosition));
                left = line.substring(0, leftPosition.character - 1);
                doublePoint = true;
            }

            // 判断是否是 this, 或上文是否有声明为 *var 或者 var-> 的字符
            var re1 = new RegExp("\\*\\s*" + word + "\\b");
            var re2 = new RegExp("\\b" + word + "\\s*->");
            var re3 = new RegExp("\\b" + word + "\\b\\s*=\\s*new\\b");
            if (word != "this" && !doublePoint && !re1.test(full) && !re2.test(full) && !re3.test(full))
                return;

            // 判断上面最近的那个是否是指针
            var pos = position;
            var reDot = new RegExp("\\b" + word + "\\.");
            var rePoi = new RegExp("\\b" + word + "\\->");
            var usePoint = true;
            while (pos.line>0)
            {
                pos = new vscode.Position(pos.line - 1, 0);
                var prevLine = document.lineAt(pos).text;
                if (reDot.test(prevLine)) {
                    usePoint = false;
                    break;
                } else if (rePoi.test(prevLine)) {
                    usePoint = true;
                    break;
                }
            }

            if (!doublePoint && !usePoint) {
                continue;
            }
        }

        // 点号的位置替换为指针
        var newEdit = vscode.TextEdit.replace(new vscode.Range(leftPosition, position), newText);

        // 添加本次的修改
        textEdits.push(newEdit);
    }

    // 不需要做出变化
    if (textEdits.length == 0)
        return ;

    // 应用到编辑器
    let wordspaceEdit = new vscode.WorkspaceEdit();
    wordspaceEdit.set(document.uri, textEdits);
    vscode.workspace.applyEdit(wordspaceEdit);

    // 延时出现提示（必须延时才会出现）
    if (right=="" || /^\W/.test(right)) { // 如果右边不是字母（即已经有变量了）
        setTimeout(function () {
            vscode.commands.executeCommand('editor.action.triggerSuggest');
        }, 100);
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
        { scheme: 'file', languages:['c', 'cpp', 'php'] }, {
        provideCompletionItems,
        resolveCompletionItem
    }, '.'));
};