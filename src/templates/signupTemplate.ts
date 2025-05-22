import { logo } from "./otpTemplate";

export const signupTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to The World of ALPRIMUS!</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
          }
          .container {
              background-color: #f9f9f9;
              border-radius: 5px;
              padding: 20px;
          }
          .header {
              text-align: center;
              padding-bottom: 15px;
              border-bottom: 1px solid #ddd;
          }
          .credentials {
              background-color: #f0f0f0;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
          }
          .button {
              display: inline-block;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              margin: 20px 0;
              border-radius: 5px;
              font-weight: bold;
          }
          .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 12px;
              color: #777;
          }
      </style>
  </head>
  <body>
      <div class="container">

          <div class="header">
              <h1>Welcome to The World of ALPRIMUS!</h1>
          </div>

          <div class="header">
            <img src="${logo}" alt="Alprimus Logo" class="logo">
          </div>

          <p>Dear {{.Name}},</p>

          <p>Congratulations and welcome to the AL-Primus family!</p>

          <p>Your registration has been successfully completed. You are now part of a global movement focused on health, wellness, and financial empowerment.</p>

          <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>User ID:</strong> {{.UserID}}</p>
              <p><strong>Password:</strong> {{.Password}}</p>
          </div>

          <div style="text-align: center;">
              <a href="{{.LoginURL}}" class="button">Login Now</a>
          </div>

          <p>If you have any questions, feel free to contact our support team.</p>

          <p>Best regards,<br>The AL-Primus Team</p>

          <div class="footer">
              <p>&copy; {{.Year}} AL-Primus. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
  `;
