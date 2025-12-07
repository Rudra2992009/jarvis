import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")

  if (!code) {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'github_auth_error', error: 'No code received' }, '*');
            window.close();
          </script>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } },
    )
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: "Ov23liQeKnMFFncThwmR",
        client_secret: process.env.GITHUB_CLIENT_SECRET || "df990c64cb46f258d8e82833b6856b041e9820f9",
        code: code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error)
    }

    const accessToken = tokenData.access_token

    // Get user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    const userData = await userResponse.json()

    // Send data back to opener window
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Login Success</title>
          <style>
            body {
              font-family: system-ui;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #0a1628;
              color: white;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .success {
              color: #22c55e;
              font-size: 48px;
              margin-bottom: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h2>Connected to GitHub!</h2>
            <p>You can close this window now.</p>
          </div>
          <script>
            window.opener.postMessage({
              type: 'github_auth_success',
              token: '${accessToken}',
              user: ${JSON.stringify({
                login: userData.login,
                avatar_url: userData.avatar_url,
                name: userData.name,
              })}
            }, '*');
            setTimeout(() => window.close(), 1500);
          </script>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } },
    )
  } catch (error) {
    console.error("GitHub OAuth error:", error)
    return new Response(
      `<!DOCTYPE html>
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'github_auth_error', error: '${error}' }, '*');
            window.close();
          </script>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } },
    )
  }
}
