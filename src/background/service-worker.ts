/**
 * MV3 service worker — relays the toolbar action and keyboard commands to the
 * active tab's content script. Holds no UI state of its own.
 */
import type { CommandMessage, RuntimeCommand } from '../types/index';

const COMMANDS: ReadonlySet<RuntimeCommand> = new Set([
  'toggle-panel',
  'next-match',
  'prev-match',
  'toggle-view',
  'add-selection',
]);

function isRuntimeCommand(value: string): value is RuntimeCommand {
  return COMMANDS.has(value as RuntimeCommand);
}

async function relay(command: RuntimeCommand): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (typeof tab?.id !== 'number') return;
  const message: CommandMessage = { type: 'mf-command', command };
  try {
    await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    // No content script on this page (e.g. chrome:// or the Web Store). Ignore.
  }
}

chrome.action.onClicked.addListener(() => {
  void relay('toggle-panel');
});

chrome.commands.onCommand.addListener((command) => {
  if (isRuntimeCommand(command)) void relay(command);
});
