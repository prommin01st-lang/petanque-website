import { Component, type ReactNode } from 'react';

interface Props {
  /** Rendered in place of the shell once its chunk (or render) has failed. */
  fallback: (error: unknown) => ReactNode;
  children: ReactNode;
}

/** Keeps a failed lazy shell chunk from unmounting the whole site. */
export default class ShellChunkBoundary extends Component<Props, { error: unknown; failed: boolean }> {
  state = { error: null as unknown, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback(this.state.error) : this.props.children;
  }
}
