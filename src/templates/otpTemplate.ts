export const logo = "https://cool.s3.n3y.in/logo.webp";

export const otpEmailStyles = `
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

.title {
    font-size: 24px;
    font-weight: 700;
    color: var(--primary-color);
    text-align: center;
    margin-bottom: 30px;
}

.content {
    font-size: 16px;
    color: var(--text-light);
    text-align: center;
}

.otp-container {
    background-color: var(--bg-light);
    padding: 24px;
    border-radius: var(--border-radius);
    margin: 30px 0;
    border-left: 4px solid var(--primary-color);
}

.otp-code {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: 8px;
    color: var(--primary-color);
    text-align: center;
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

.expires {
    color: #e74c3c;
    font-weight: 600;
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
`;

export const emailVerifyOtpTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alprimus - Your OTP Code</title>
      <style>
          ${otpEmailStyles}
      </style>
  </head>
  <body>
      <div class="container">
          <div class="logo-container">
              <img src="${logo}" alt="Alprimus Logo" class="logo">
          </div>

          <h1 class="title">Verification Code</h1>

          <div class="content">
              <p>Dear {{.Name}},</p>
              <p>Your one-time password (OTP) for Alprimus account verification is:</p>

              <div class="otp-container">
                  <div class="otp-code">{{.OTP}}</div>
              </div>

              <p>This code will <span class="expires">expire in {{.ExpiryMinutes}} minutes</span>.</p>

              <p>If you didn't request this code, please ignore this email or contact our support team if you have concerns.</p>

              <div class="button-container">
                  <a href="{{.SupportURL}}" class="button">Contact Support</a>
              </div>

              <p>Thank you for choosing Alprimus!</p>
          </div>

          <div class="divider"></div>

          <div class="footer">
              <p>&copy; {{.Year}} Alprimus. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
              <p>
                  <a href="{{.PrivacyURL}}">Privacy Policy</a> |
                  <a href="{{.TermsURL}}">Terms of Service</a>
              </p>

              <div class="social-links">
                  <span class="social-icon">•</span>
                  <span class="social-icon">•</span>
                  <span class="social-icon">•</span>
              </div>
          </div>
      </div>
  </body>
  </html>
  `;

export const walletWithdrawalOtpTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alprimus - Wallet Withdrawal OTP</title>
      <style>
          ${otpEmailStyles}
      </style>
  </head>
  <body>
      <div class="container">
          <div class="logo-container">
              <img src="${logo}" alt="Alprimus Logo" class="logo">
          </div>

          <h1 class="title">Wallet Withdrawal Verification</h1>

          <div class="content">
              <p>Dear {{.Name}},</p>
              <p>You've requested to withdraw {{.Amount}} from your Alprimus wallet.</p>
              <p>Please use the following OTP to authorize this transaction:</p>

              <div class="otp-container">
                  <div class="otp-code">{{.OTP}}</div>
              </div>

              <p>This code will <span class="expires">expire in {{.ExpiryMinutes}} minutes</span>.</p>

              <p>If you didn't initiate this withdrawal, please contact our support team immediately for security assistance.</p>

              <div class="button-container">
                  <a href="{{.SupportURL}}" class="button">Contact Support</a>
              </div>

              <p>Thank you for choosing Alprimus!</p>
          </div>

          <div class="divider"></div>

          <div class="footer">
              <p>&copy; {{.Year}} Alprimus. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
              <p>
                  <a href="{{.PrivacyURL}}">Privacy Policy</a> |
                  <a href="{{.TermsURL}}">Terms of Service</a>
              </p>

              <div class="social-links">
                  <span class="social-icon">•</span>
                  <span class="social-icon">•</span>
                  <span class="social-icon">•</span>
              </div>
          </div>
      </div>
  </body>
  </html>
  `;
