import { describe, it, expect, vi } from 'vitest';
import { SessionModel } from '../src/core/session';

describe('SessionModel', () => {
  it('adds terms with a color, id, and active selection', () => {
    const s = new SessionModel();
    const term = s.addTerm('hello');
    expect(term.id).toBeTruthy();
    expect(term.color).toMatch(/^#/);
    expect(term.textColor).toMatch(/^#/);
    expect(s.getSnapshot().activeTermId).toBe(term.id);
    expect(s.getSnapshot().terms).toHaveLength(1);
  });

  it('assigns distinct colors to successive terms', () => {
    const s = new SessionModel();
    const a = s.addTerm('a');
    const b = s.addTerm('b');
    expect(a.color).not.toBe(b.color);
  });

  it('removes terms and updates the active id', () => {
    const s = new SessionModel();
    const a = s.addTerm('a');
    const b = s.addTerm('b');
    s.removeTerm(b.id);
    expect(s.getSnapshot().terms).toHaveLength(1);
    expect(s.getSnapshot().activeTermId).toBe(a.id);
  });

  it('recomputes text color when the color changes', () => {
    const s = new SessionModel();
    const t = s.addTerm('a');
    s.updateTerm(t.id, { color: '#000000' });
    expect(s.getSnapshot().terms[0]!.textColor).toBe('#ffffff');
  });

  it('toggles options and enabled state', () => {
    const s = new SessionModel();
    const t = s.addTerm('a');
    s.setOption(t.id, 'regex', true);
    expect(s.getSnapshot().terms[0]!.options.regex).toBe(true);
    s.toggleEnabled(t.id);
    expect(s.getSnapshot().terms[0]!.enabled).toBe(false);
  });

  it('serializes and loads terms', () => {
    const s = new SessionModel();
    s.addTerm('one');
    s.addTerm('two');
    const serialized = s.serializeTerms();
    expect(serialized).toHaveLength(2);

    const s2 = new SessionModel();
    s2.loadTerms(serialized);
    expect(s2.getSnapshot().terms.map((t) => t.query)).toEqual(['one', 'two']);
    // ids are freshly generated
    expect(s2.getSnapshot().terms[0]!.id).toBeTruthy();
  });

  it('notifies subscribers on change', () => {
    const s = new SessionModel();
    const listener = vi.fn();
    s.subscribe(listener); // immediate call
    s.addTerm('x');
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('toggles view mode', () => {
    const s = new SessionModel();
    expect(s.getViewMode()).toBe('panel');
    s.toggleViewMode();
    expect(s.getViewMode()).toBe('overview');
  });
});
