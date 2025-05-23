import { logo, otpEmailStyles } from ".";

export const passwordResetTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alprimus - Password Reset</title>
      <style>
          ${otpEmailStyles}
      </style>
  </head>
  <body>
      <div class="container">
          <div class="logo-container">
              <img src="${logo}" alt="Alprimus Logo" class="logo">
          </div>

          <h1 class="title">Password Reset</h1>

          <div class="content">
              <p>Dear {{.Name}},</p>
              <p>We received a request to reset your Alprimus account password. Please use the following code to complete the process:</p>

              <div class="otp-container">
                  <div class="otp-code">{{.OTP}}</div>
              </div>

              <p>This code will <span class="expires">expire in {{.ExpiryMinutes}} minutes</span>.</p>

              <p>If you didn't request a password reset, please ignore this email or contact our support team if you have concerns about your account security.</p>

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
