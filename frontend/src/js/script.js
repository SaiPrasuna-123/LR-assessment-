document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const messageDiv = document.getElementById("message");
    messageDiv.textContent = "";

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.status === 200) {
        messageDiv.style.color = "green";
        messageDiv.textContent = "Login successful! Redirecting...";
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        messageDiv.style.color = "red";
        messageDiv.textContent = data.message || "Login failed.";
      }
    } catch (error) {
      messageDiv.style.color = "red";
      messageDiv.textContent = "Network error. Please try again later.";
    }
  });
