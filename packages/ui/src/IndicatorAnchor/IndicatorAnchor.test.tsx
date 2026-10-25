/**
 * A mark with an indicator at its top end corner: the dot centred on the
 * corner by the component's own layout, ringed in the control's fill, and
 * hidden from assistive technology, whose words come from the control.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { Button } from '../Button/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { IndicatorAnchor } from './index.js';

afterEach(cleanup);

test('wears the indicator on the mark’s top end corner, hidden from assistive technology', () => {
  const uninstall = installThemed('light', 'IndicatorAnchor/IndicatorAnchor.css');
  const { container } = render(
    <IndicatorAnchor indicator={<StatusDot tone="warning" />}>
      <svg data-testid="mark" />
    </IndicatorAnchor>,
  );
  const anchor = container.querySelector('.crewlet-indicator-anchor')!;
  const indicator = anchor.querySelector<HTMLElement>('.crewlet-indicator-anchor__indicator')!;
  expect(getComputedStyle(anchor).position).toBe('relative');
  const style = getComputedStyle(indicator);
  expect(style.position).toBe('absolute');
  expect(style.getPropertyValue('inset-block-start')).toBe('0px');
  expect(style.getPropertyValue('inset-inline-end')).toBe('0px');
  expect(style.transform).toBe('translate(50%, -50%)');
  expect(indicator.getAttribute('aria-hidden')).toBe('true');
  uninstall();
});

test('draws nothing at the corner without an indicator', () => {
  const { container } = render(
    <IndicatorAnchor indicator={null}>
      <svg />
    </IndicatorAnchor>,
  );
  expect(container.querySelector('.crewlet-indicator-anchor__indicator')).toBeNull();
});

test('a secondary button rings the dot in its own fill, and its name says why', () => {
  const uninstall = installThemed('light', 'Button/Button.css', 'IndicatorAnchor/IndicatorAnchor.css');
  render(
    <Button
      variant="secondary"
      leadingIcon={
        <IndicatorAnchor indicator={<StatusDot tone="warning" />}>
          <svg />
        </IndicatorAnchor>
      }
    >
      Ask
      <VisuallyHidden>, a change waits on your approval</VisuallyHidden>
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Ask, a change waits on your approval' });
  // The ring's colour, resolved as a background would be, is the button's own.
  const probe = document.createElement('span');
  probe.style.backgroundColor = getComputedStyle(button).getPropertyValue('--crewlet-indicator-ring').trim();
  document.body.append(probe);
  expect(getComputedStyle(probe).backgroundColor).toBe(getComputedStyle(button).backgroundColor);
  probe.remove();
  uninstall();
});
