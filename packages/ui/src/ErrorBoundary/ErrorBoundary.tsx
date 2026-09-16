import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../Button/index.js';

export interface ErrorBoundaryProps {
  /**
   * What the reader is looking at. A NEW VALUE IS A NEW CHANCE TO RENDER, so a
   * route, a tab or a selected record is the right thing to pass: without one,
   * a boundary that has caught stays caught until the page is reloaded, and
   * going somewhere else shows the failure of the screen you left.
   */
  resetKey?: string | number | undefined;
  /** Draws the failure. Without one, the boundary draws the block below. */
  fallback?: ((error: Error, reset: () => void) => ReactNode) | undefined;
  /**
   * Reports the failure to wherever the application collects them.
   *
   * The one thing a fallback cannot do: it runs during a render, where a write
   * to a log, a counter or a session is a side effect in the wrong phase.
   */
  onError?: ((error: Error, info: ErrorInfo) => void) | undefined;
  /** The default fallback's heading. */
  title?: string | undefined;
  /** The default fallback's sentence. */
  description?: string | undefined;
  /** The default fallback's button. */
  retryLabel?: string | undefined;
  children?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** The key the current state belongs to, so a change of key is visible here. */
  resetKey: string | number | undefined;
}

/**
 * One region that throws takes itself down, and nothing else.
 *
 * WITHOUT ONE, A RENDER ERROR UNMOUNTS THE WHOLE APPLICATION. That is React's
 * contract, and it is what one malformed field did to the dashboard this is
 * ported from: a seat whose model was a per-phase mapping reached a component
 * as an object child, and the reader was left with a blank page, no navigation
 * and no way to learn which screen or which field. The console that has no
 * boundary at all has the same failure waiting in it.
 *
 * WHERE IT GOES: around the routed screen, and only there. The shell around it
 * is what a reader needs in order to get somewhere else, so a boundary that
 * wraps the shell too takes the way out down with the screen.
 *
 * IT RESETS on a new `resetKey` and when the reader asks to try again. React
 * reports a caught error to the console itself, so this logs nothing: a second
 * report says the same thing twice and makes the first one harder to find.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    // A thrown value need not be an Error. What reaches the fallback always is.
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const {
      fallback,
      title = 'This part of the page could not be drawn',
      description = 'Something it received did not have the shape it expects. The rest of the page keeps working, and the message below is what to include in a report.',
      retryLabel = 'Try again',
    } = this.props;
    if (fallback) return fallback(error, this.reset);
    return (
      <div className="crewlet-error-boundary" role="alert">
        <p className="crewlet-error-boundary__title">{title}</p>
        <p className="crewlet-error-boundary__description">{description}</p>
        {/*
         * The message verbatim, in the mono face, because the copy above asks
         * the reader to put it in a report: a message reflowed into prose is
         * one nobody can match against a log line.
         */}
        <pre className="crewlet-error-boundary__message">{error.message || error.name}</pre>
        <Button variant="secondary" size="small" onClick={this.reset}>
          {retryLabel}
        </Button>
      </div>
    );
  }
}
