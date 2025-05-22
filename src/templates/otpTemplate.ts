export const otpEmailStyles = `
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #f9f9f9;
}
.container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
}
.header {
    text-align: center;
    padding: 20px 0;
    border-bottom: 1px solid #eee;
}
.logo {
    max-height: 60px;
}
.content {
    padding: 30px 20px;
    text-align: center;
}
.otp-container {
    margin: 30px 0;
    padding: 15px;
    background-color: #f5f7fa;
    border-radius: 8px;
}
.otp-code {
    font-size: 32px;
    font-weight: bold;
    letter-spacing: 5px;
    color: #2c3e50;
}
.footer {
    text-align: center;
    padding: 20px;
    font-size: 12px;
    color: #999;
    border-top: 1px solid #eee;
}
.button {
    display: inline-block;
    padding: 10px 20px;
    margin: 20px 0;
    background-color: #3498db;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
}
.expires {
    color: #e74c3c;
    font-weight: bold;
}
`;
export const logo = "https://cool.s3.n3y.in/logo.webp";
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
          <div class="header">
              <img src="${logo}" alt="Alprimus Logo" class="logo">
          </div>
          <div class="content">
              <h2>Verification Code</h2>
              <p>Hello {{.Name}},</p>
              <p>Your one-time password (OTP) for Alprimus account verification is:</p>

              <div class="otp-container">
                  <div class="otp-code">{{.OTP}}</div>
              </div>

              <p>This code will <span class="expires">expire in {{.ExpiryMinutes}} minutes</span>.</p>

              <p>If you didn't request this code, please ignore this email or contact our support team if you have concerns.</p>

              <a href="{{.SupportURL}}" class="button">Contact Support</a>

              <p>Thank you for choosing Alprimus!</p>
          </div>
          <div class="footer">
              <p>&copy; {{.Year}} Alprimus. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
              <p>
                  <a href="{{.PrivacyURL}}">Privacy Policy</a> |
                  <a href="{{.TermsURL}}">Terms of Service</a>
              </p>
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
          <div class="header">
              <img src="https://yourcompany.com/logo.png" alt="Alprimus Logo" class="logo">
          </div>
          <div class="content">
              <h2>Wallet Withdrawal Verification</h2>
              <p>Hello {{.Name}},</p>
              <p>You've requested to withdraw {{.Amount}} from your Alprimus wallet.</p>
              <p>Please use the following OTP to authorize this transaction:</p>

              <div class="otp-container">
                  <div class="otp-code">{{.OTP}}</div>
              </div>

              <p>This code will <span class="expires">expire in {{.ExpiryMinutes}} minutes</span>.</p>

              <p>If you didn't initiate this withdrawal, please contact our support team immediately for security assistance.</p>

              <a href="{{.SupportURL}}" class="button">Contact Support</a>

              <p>Thank you for choosing Alprimus!</p>
          </div>
          <div class="footer">
              <p>&copy; {{.Year}} Alprimus. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
              <p>
                  <a href="{{.PrivacyURL}}">Privacy Policy</a> |
                  <a href="{{.TermsURL}}">Terms of Service</a>
              </p>
          </div>
      </div>
  </body>
  </html>
  `;
