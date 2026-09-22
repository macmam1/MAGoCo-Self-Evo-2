/**
 * Execution view for PR #38 — run button + output panel.
 * No build required; loads via ESM from packages/web.
 */

export interface RunState {
  status: 'idle' | 'running' | 'done' | 'error';
  output: string;
  error?: string;
}

export function renderExecutionView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'execution-view';
  container.innerHTML = `
    <div class="execution-controls">
      <button id="run-btn" type="button">Run Code</button>
      <button id="stop-btn" type="button" disabled>Stop</button>
    </div>
    <div class="execution-output">
      <pre id="output"></pre>
    </div>
  `;

  const runBtn = container.querySelector<HTMLButtonElement>('#run-btn')!;
  const stopBtn = container.querySelector<HTMLButtonElement>('#stop-btn')!;
  const output = container.querySelector<HTMLPreElement>('#output')!;

  let state: RunState = { status: 'idle', output: '' };

  runBtn.addEventListener('click', async () => {
    state.status = 'running';
    state.output = '';
    state.error = undefined;
    runBtn.disabled = true;
    stopBtn.disabled = false;
    output.textContent = 'Running...';

    try {
      // TODO: Connect to magoco.code.run capability via websocket
      const response = await fetch('/api/run', {
        method: 'POST',
        body: JSON.stringify({ source: 'console.log("hello")', language: 'js' }),
      });
      const data = await response.json();
      state.output = data.stdout || '';
      state.status = 'done';
      output.textContent = data.stdout || '';
    } catch (e) {
      state.error = (e as Error).message;
      state.status = 'error';
      output.textContent = `Error: ${(e as Error).message}`;
    } finally {
      runBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });

  stopBtn.addEventListener('click', () => {
    // TODO: Send stop signal to running process
    state.status = 'error';
    state.error = 'Execution stopped';
    output.textContent = 'Stopped';
    runBtn.disabled = false;
    stopBtn.disabled = true;
  });

  return container;
}
