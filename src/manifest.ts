import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Multi-Find',
  version: pkg.version,
  description:
    'Find, highlight, and navigate multiple search terms at once — each in its own color, with regex, counts, saved sets, watchlists, and a minimap.',
  minimum_chrome_version: '105',
  action: {
    default_title: 'Multi-Find — toggle panel',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  permissions: ['storage', 'activeTab'],
  host_permissions: ['<all_urls>'],
  commands: {
    'toggle-panel': {
      suggested_key: { default: 'Alt+Shift+F' },
      description: 'Toggle the Multi-Find panel',
    },
    'next-match': {
      suggested_key: { default: 'Alt+Shift+G' },
      description: 'Go to next match',
    },
    'prev-match': {
      description: 'Go to previous match',
    },
    'toggle-view': {
      description: 'Switch between panel and overview',
    },
    'add-selection': {
      description: 'Add the selected text as a search term',
    },
  },
});
