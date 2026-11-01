import { UIManager } from './ui';

function boot(): void {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Root #app container not found');
  }

  const ui = new UIManager(root);
  ui.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
