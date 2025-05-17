package emailservice

import (
	"context"
	"html/template"
	"sync"
)

type EmailTemplate struct {
	Subject string
	Body    string
}

type EmailData struct {
	To       string
	Subject  string
	Body     string
	UserId   string
	Name     string
	OTP      string
	Metadata map[string]string
}

type EmailService struct {
	templates    map[string]*template.Template
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPass     string
	senderEmail  string
	templatesDir string
	emailQueue   chan EmailData
	workerCount  int
	wg           sync.WaitGroup
	ctx          context.Context
	cancel       context.CancelFunc
}
