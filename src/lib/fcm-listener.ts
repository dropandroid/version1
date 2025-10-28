
// This code runs on the client and creates the "bridge"
// for the Android app to send the token to.

// 1. Extend the 'window' object type to include our function
declare global {
  interface Window {
    receiveFCMToken: (token: string) => void;
  }
}

// 2. Create the function on the window
if (typeof window !== 'undefined') {
  window.receiveFCMToken = (token: string) => {
    console.log("✅ [Step 1: The Bridge] 'receiveFCMToken' called by Android. Dispatching event now.");

    // 3. Create a new custom event and dispatch it.
    // This is how we pass the token from the plain JavaScript 'window'
    // into the React application.
    const event = new CustomEvent('fcmTokenReceived', { detail: token });
    window.dispatchEvent(event);
  };
}
