/**
 * The id the OTP screen verifies against. Deliberately module state, not a route param and not
 * the persisted session: it must not show up in the web URL, in history, or in a shared link,
 * and a reload should send the user back to the number rather than to a stale request.
 */
let requestId: string | undefined;

export const setOtpRequestId = (id: string | undefined) => {
  requestId = id;
};

export const getOtpRequestId = () => requestId;
