import * as vscode from 'vscode';
import axios from 'axios';

const LLaMA_API_KEY = "LA-e9b1324369b04194859afb13dd423e0fa3da6ad82e48469197a1948d4e578649";

async function callLLaMAAPI(query: string): Promise<string> {
    try {
        const response = await axios.post('https://api.llama3.2/endpoint', {
            query: query,
            apiKey: LLaMA_API_KEY
        });
        return response.data.result;
    } catch (error) {
        console.error('Error calling LLaMA API:', error);
        return 'Error calling LLaMA API';
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('🔥 MinionsAssemble extension activating...');

    try {
        const disposable = vscode.commands.registerCommand('minion.MinionsAssemble', async () => {
            const query = await vscode.window.showInputBox({ prompt: 'Enter your query for LLaMA 3.2' });
            if (query) {
                const result = await callLLaMAAPI(query);
                vscode.window.showInformationMessage(result);
            }

            const panel = vscode.window.createWebviewPanel(
                "llama3.2",
                'Chat with Minions',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            panel.webview.html = getviewContent();

            panel.webview.onDidReceiveMessage(async (message: any) => {
                if (message.command === 'chat') {
                    const userPrompt = message.text;
                    let responseText = '';
                    try {
                        const response = await axios.post('http://localhost:11434/api/generate', {
                            model: 'llama3.2',
                            prompt: userPrompt
                        }, {
                            responseType: 'stream'
                        });

                        response.data.on('data', (chunk: any) => {
                            const data = JSON.parse(chunk.toString());
                            if (data.response) {
                                responseText += data.response;
                            }
                        });

                        response.data.on('end', () => {
                            panel.webview.postMessage({ command: 'chatResponse', text: responseText });
                        });

                    } catch (err) {
                        console.error('Error calling API:', err);
                        panel.webview.postMessage({ command: 'chatResponse', text: 'Error: ' + err });
                    }
                }
            });
        });

        context.subscriptions.push(disposable);
        console.log("🎉 MinionsAssemble extension activated successfully!");
    } catch (error) {
        console.error("❌ Activation failed:", error);
    }
}

function getviewContent(): string {
    return  /*html*/`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Minions Chat</title>
        <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        #chat-container {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            border-bottom: 1px solid #ccc;
        }
        #input-container {
            display: flex;
            padding: 10px;
            border-top: 1px solid #ccc;
        }
        #input-container input {
            flex: 1;
            padding: 10px;
            font-size: 16px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        #input-container button {
            padding: 10px 20px;
            font-size: 16px;
            margin-left: 10px;
            border: none;
            border-radius: 4px;
            background-color: #007acc;
            color: white;
            cursor: pointer;
        }
        .message {
            margin: 10px 0;
            padding: 10px;
            border-radius: 4px;
        }
        .message.user {
            background-color: #007acc;
            color: white;
            align-self: flex-end;
        }
        .message.ai {
            background-color: #f1f1f1;
            color: black;
            align-self: flex-start;
        }
        </style>
    </head>
    <body>
        <h1>Minions Chatbot</h1>
        <div id="chat-container"></div>
        <div id="input-container">
            <input type="text" id="user-input" placeholder="Type a message..." />
            <button onclick="sendMessage()">Inquire</button>
        </div>
        <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('user-input').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
        document.querySelector('button').addEventListener('click', sendMessage);

        function sendMessage() {
            const text = document.getElementById('user-input').value;
            if (text.trim() === '') return;
            addMessage('user', text);
            vscode.postMessage({ command: 'chat', text });
        }

        window.addEventListener('message', event => {
            const { command, text } = event.data;
            if (command === 'chatResponse') {
                addMessage('ai', text);
            }
        });

        function addMessage(sender, text) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', sender);
            messageElement.textContent = text;
            document.getElementById('chat-container').appendChild(messageElement);
            document.getElementById('chat-container').scrollTop = document.getElementById('chat-container').scrollHeight;
        }
        </script>
    </body>
    </html>`;
}

export function deactivate() {
    console.log("⚠️ MinionsAssemble extension deactivated.");
}
