// Shared mailto template for feature requests. Used by both the marketing
// closing footer and the in-app sidebar so the contact email and body stay in
// sync. encodeURIComponent runs once at module load so newlines render as %0A.

export const CONTACT_EMAIL = "rumiallbert@gmail.com";

const FEATURE_REQUEST_SUBJECT = "Vertor — feature request";

const FEATURE_REQUEST_BODY = `Hi Rumi,

What would you like Vertor to do that it doesn't yet?

(a sentence or two)


Why would it help your workflow?

(a paragraph is plenty — who you are, what you translate, where Vertor falls short today)


Examples or references (optional):

(links, screenshots, prior art in other tools)


—
Sent from vertor.vercel.app`;

export const FEATURE_REQUEST_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  FEATURE_REQUEST_SUBJECT,
)}&body=${encodeURIComponent(FEATURE_REQUEST_BODY)}`;
