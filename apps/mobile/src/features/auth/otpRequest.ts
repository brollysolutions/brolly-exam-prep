/**
 * The id the OTP screen verifies against. Deliberately module state, not a route param and not
 * the persisted session: it must not show up in the web URL, in history, or in a shared link,
 * and a reload should send the user back to the number rather than to a stale request.
 */
let requestId: string | undefined;
/**
 * The code the API handed back alongside the id. Only a test build (the mock API, the real one
 * in `OTP_DEV_MODE`) returns one; production sends an SMS and leaves it out. Lives and dies
 * with the request id and never touches persisted state.
 */
let devCode: string | undefined;

export const setOtpRequestId = (id: string | undefined, code?: string | null) => {
  requestId = id;
  devCode = id ? (code ?? undefined) : undefined;
};

export const getOtpRequestId = () => requestId;

export const getOtpDevCode = () => devCode;
