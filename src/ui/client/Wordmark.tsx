/**
 * vi·CV·ersa. The one bold thing in the panel: "CV" set in the editorial serif,
 * italic, over a highlighter stroke — the gesture of marking which pieces of
 * your history go into this version.
 */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} aria-label="vicversa">
      <span aria-hidden>vi</span>
      <em aria-hidden>CV</em>
      <span aria-hidden>ersa</span>
    </span>
  );
}
