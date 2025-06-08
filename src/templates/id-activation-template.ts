import { logo } from "./otp-template";

export const activationTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your ALPRIMUS Account is Activated!</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

          :root {
              --primary-color: #3a6cf4;
              --accent-color: #2d4eaa;
              --text-color: #333;
              --text-light: #666;
              --bg-color: #ffffff;
              --bg-light: #f8faff;
              --border-radius: 12px;
              --box-shadow: 0 6px 18px rgba(0,0,0,0.05);
          }

          body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              line-height: 1.6;
              color: var(--text-color);
              background-color: #f5f7ff;
              max-width: 600px;
              margin: 0 auto;
              padding: 30px 15px;
          }

          .container {
              background-color: var(--bg-color);
              border-radius: var(--border-radius);
              box-shadow: var(--box-shadow);
              padding: 40px 30px;
          }

          .logo-container {
              text-align: center;
              margin-bottom: 25px;
          }

          .logo {
              max-width: 160px;
              height: auto;
          }

          .welcome-title {
              font-size: 24px;
              font-weight: 700;
              color: var(--primary-color);
              text-align: center;
              margin-bottom: 30px;
          }

          .content {
              font-size: 16px;
              color: var(--text-light);
          }

          .highlight-box {
              background-color: var(--bg-light);
              padding: 20px;
              border-radius: var(--border-radius);
              margin: 30px 0;
              border-left: 4px solid var(--primary-color);
          }

          .highlight-box h3 {
              margin: 0 0 10px;
              font-size: 18px;
              color: var(--primary-color);
          }

          .button-container {
              text-align: center;
              margin: 35px 0;
          }

          .button {
              display: inline-block;
              background-color: var(--primary-color);
              color: white;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 50px;
              font-weight: 600;
              font-size: 16px;
              transition: background-color 0.2s ease;
          }

          .button:hover {
              background-color: var(--accent-color);
          }

          .footer {
              text-align: center;
              font-size: 14px;
              color: var(--text-light);
              margin-top: 30px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="logo-container">
              <img src="${logo}" alt="Alprimus Logo" class="logo">
          </div>

          <h1 class="welcome-title">Your Account is Activated!</h1>

          <div class="content">
              <p>Hi {{.Name}},</p>

              <p>We’re thrilled to inform you that your ALPRIMUS account is now fully <strong>activated</strong>!</p>

              <div class="highlight-box">
                  <h3>Here’s what’s unlocked for you:</h3>
                  <ul>
                      <li><strong>+50 BV</strong> has been credited to your account.</li>
                      <li>You’re now eligible to <strong>earn up to $5,000 USD</strong>.</li>
                      <li>Withdrawals are now <strong>enabled</strong> for your account.</li>
                  </ul>
              </div>

              <p>This is your first step towards financial freedom with ALPRIMUS. Make sure to start building your team and make the most of your earning potential!</p>

              <div class="button-container">
                  <a href="https://app.alprimus.com/login" class="button">Go to Dashboard</a>
              </div>

              <p class="footer">
                  User ID: <strong>{{.UserID}}</strong><br/>
                  Email: <strong>{{.Email}}</strong><br/>
                  © {{.Year}} ALPRIMUS. All rights reserved.
              </p>
          </div>
      </div>
  </body>
  </html>
`;
