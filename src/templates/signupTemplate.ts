import { logo } from "./otpTemplate";

export const signupTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to The World of ALPRIMUS!</title>
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

          .credentials {
              background-color: var(--bg-light);
              padding: 24px;
              border-radius: var(--border-radius);
              margin: 30px 0;
              border-left: 4px solid var(--primary-color);
          }

          .credentials h3 {
              margin-top: 0;
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

          .divider {
              height: 1px;
              background-color: rgba(0,0,0,0.08);
              margin: 30px 0;
          }

          .footer {
              text-align: center;
              font-size: 14px;
              color: var(--text-light);
          }

          .social-links {
              text-align: center;
              margin-top: 25px;
          }

          .social-icon {
              display: inline-block;
              margin: 0 8px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="logo-container">
              <img src="${logo}" alt="Alprimus Logo" class="logo">
          </div>

          <h1 class="welcome-title">Welcome to The World of ALPRIMUS!</h1>

          <div class="content">
              <p>Dear {{.Name}},</p>

              <p>Congratulations and welcome to the AL-Primus family! 🎉</p>

              <p>Your registration has been successfully completed. You are now part of a global movement focused on health, wellness, and financial empowerment.</p>

              <div class="credentials">
                  <h3>Your Login Credentials</h3>
                  <p><strong>User ID:</strong> {{.UserID}}</p>
                  <p style="margin-bottom: 0;"><strong>Password:</strong> {{.Password}}</p>
              </div>

              <div class="button-container">
                  <a href="{{.LoginURL}}" class="button">Login Now</a>
              </div>

              <p>If you have any questions or need assistance, our support team is always ready to help you on your journey with us.</p>

              <p>Best regards,<br>The AL-Primus Team</p>
          </div>

          <div class="divider"></div>

          <div class="footer">
              <p>&copy; {{.Year}} AL-Primus. All rights reserved.</p>

              <div class="social-links">
                  <!-- You can add social media icons here -->
                  <span class="social-icon">•</span>
                  <span class="social-icon">•</span>
                  <span class="social-icon">•</span>
              </div>
          </div>
      </div>
  </body>
  </html>
  `;
