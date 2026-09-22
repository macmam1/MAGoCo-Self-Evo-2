/**
 * Terminal view for PR #37 — xterm.js integration.
 */

export interface TermState {
  readonly id: string;
  status: 'connecting' | 'connected' | 'disconnected';
  readonly output: string;
}

export function renderTerminalView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'terminal-view';
  container.innerHTML = `
    <div class="terminal-controls">
      <button id="terminal-connect" type="button">Connect</button>
      <button id="terminal-disconnect" type="button" disabled>Disconnect</button>
    </div>
    <div id="terminal-container"></div>
  `;

  const connectBtn = container.querySelector<HTMLButtonElement>('#terminal-connect')!;
  const disconnectBtn = container.querySelector<HTMLButtonElement>('#terminal-disconnect')!;
  const terminalContainer = container.querySelector<HTMLDivElement>('#terminal-container')!;

  let ws: WebSocket | null = null;
  let output = '';

  connectBtn.addEventListener('click', () => {
    ws = new WebSocket(`ws://${window.location.host}/terminal`);

    ws.onopen = () => {
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      output = 'Connected';
      terminalContainer.textContent = output;
    };

    ws.onmessage = (event) => {
      output += event.data;
      terminalContainer.textContent = output;
    };

    ws.onclose = () => {
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      output += '\\nDisconnected\\n';
      terminalContainer.textContent = output;
    };

    ws.onerror = (err) => {
      output += '\\nError: connection failed\\n';
      terminalContainer.textContent = output;
    };
  });

  disconnectBtn.addEventListener('click', () => {
    if (ws) {
      ws.close();
      ws = null;
    }
  });

  return container;
}
