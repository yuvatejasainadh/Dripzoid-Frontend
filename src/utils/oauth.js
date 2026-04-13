// utils/oauth.js
export function openGoogleOAuthPopup(onSuccess, onError) {
  const width = 500, height = 600;
  const left = window.screenX + (window.innerWidth - width) / 2;
  const top = window.screenY + (window.innerHeight - height) / 2;

  const popup = window.open(
    "https://dripzoid-backend.onrender.com/api/auth/google",
    "google_oauth",
    `width=${width},height=${height},top=${top},left=${left}`
  );

  window.addEventListener("message", function listener(event) {
    if (event.origin !== "https://your-frontend-domain.com") return;

    const data = event.data;
    if (data?.token) {
      onSuccess(data);
      window.removeEventListener("message", listener);
      popup.close();
    } else if (data?.error) {
      onError(data.error);
      window.removeEventListener("message", listener);
      popup.close();
    }
  });
}
