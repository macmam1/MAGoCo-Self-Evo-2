/**
 * Editor view for PR #35/38 — Monaco with textarea fallback.
 * No build required; loads Monaco via CDN ESM with graceful degradation.
 */

export interface EditorState {
  content: string;
  language: 'js' | 'py';
  modified: boolean;
}

export function renderEditorView(): { container: HTMLElement; onChange: (fn: (val: EditorState) => EditorState) => void } {
  const container = document.createElement('div');
  container.className = 'editor-view';
  
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.innerHTML = `
    <label>Language: <select id="lang-select"><option value="js">JavaScript</option><option value="py">Python</option></select></label>
  `;

  const editorContainer = document.createElement('div');
  editorContainer.id = 'editor-container';
  editorContainer.style.cssText = 'height: 400px; border: 1px solid #ccc;';

  const fallbackTextarea = document.createElement('textarea');
  fallbackTextarea.id = 'fallback-textarea';
  fallbackTextarea.style.cssText = 'display: none; height: 400px; width: 100%; font-family: monospace;';

  container.appendChild(toolbar);
  container.appendChild(editorContainer);
  container.appendChild(fallbackTextarea);

  const langSelect = toolbar.querySelector<HTMLSelectElement>('#lang-select')!;
  let state: EditorState = { content: '', language: 'js', modified: false };
  let onChangeHandlers: Array<(val: EditorState) => EditorState> = [];

  const onChange = (fn: (val: EditorState) => EditorState) => {
    onChangeHandlers.push(fn);
  };

  const updateState = (updates: Partial<EditorState>) => {
    state = { ...state, ...updates };
    onChangeHandlers.forEach(fn => { state = fn(state); });
  };

  // Try to load Monaco from CDN
  const loadMonaco = async () => {
    try {
      // Monaco ESM loader via CDN
      await import('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js');
      (window as any).require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
      
      await new Promise<void>((resolve) => {
        (window as any).require(['vs/editor/editor.main'], () => resolve());
      });

      // Create Monaco editor
      const monacoEditor = (window as any).monaco.editor.create(editorContainer, {
        value: state.content,
        language: state.language === 'js' ? 'javascript' : 'python',
        theme: 'vs-dark',
        automaticLayout: true,
      });

      monacoEditor.onDidChangeModelContent(() => {
        const val = monacoEditor.getValue();
        updateState({ content: val, modified: val !== state.content });
      });

      // Update language selection
      langSelect.addEventListener('change', () => {
        const lang = langSelect.value as 'js' | 'py';
        updateState({ language: lang });
        monacoEditor.setValue(state.content);
        monacoEditor.setModel((window as any).monaco.editor.createModel(
          state.content,
          lang === 'js' ? 'javascript' : 'python'
        ));
      });

      fallbackTextarea.style.display = 'none';
      editorContainer.style.display = 'block';
    } catch (e) {
      // Fallback to textarea
      console.log('Monaco unavailable, using textarea fallback');
      fallbackTextarea.value = state.content;
      fallbackTextarea.style.display = 'block';
      editorContainer.style.display = 'none';

      fallbackTextarea.addEventListener('input', () => {
        const val = fallbackTextarea.value;
        updateState({ content: val, modified: val !== state.content });
      });

      langSelect.addEventListener('change', () => {
        updateState({ language: langSelect.value as 'js' | 'py' });
      });
    }
  };

  loadMonaco().catch(() => {
    // Force fallback
    fallbackTextarea.value = state.content;
    fallbackTextarea.style.display = 'block';
  });

  return { container, onChange };
}
