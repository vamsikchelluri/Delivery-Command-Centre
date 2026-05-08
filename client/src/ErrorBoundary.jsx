import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // Keep this lightweight; the visible fallback is the main debugging aid.
    console.error("Route render error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-banner">
          {this.state.error.message || "Unexpected page error."}
        </div>
      );
    }
    return this.props.children;
  }
}
