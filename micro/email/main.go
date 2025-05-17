package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"math/rand"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
	"sync"

	"github.com/thanksduck/emailService/envcheck"
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
	Data     map[string]interface{}
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

func NewEmailService(templatesDir string) *EmailService {
	ctx, cancel := context.WithCancel(context.Background())

	service := &EmailService{
		templates:    make(map[string]*template.Template),
		smtpHost:     os.Getenv("SMTP_HOST"),
		smtpPort:     os.Getenv("SMTP_PORT"),
		smtpUser:     os.Getenv("SMTP_USER"),
		smtpPass:     os.Getenv("SMTP_PASS"),
		senderEmail:  os.Getenv("SENDER_EMAIL"),
		templatesDir: templatesDir,
		emailQueue:   make(chan EmailData, 100),
		workerCount:  5,
		ctx:          ctx,
		cancel:       cancel,
	}

	service.loadTemplates()
	service.startWorkers()

	return service
}

func (s *EmailService) loadTemplates() {
	files, err := os.ReadDir(s.templatesDir)
	if err != nil {
		log.Fatalf("Failed to read templates directory: %v", err)
	}

	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".html" {
			slug := file.Name()[:len(file.Name())-5]
			tmpl, err := template.ParseFiles(filepath.Join(s.templatesDir, file.Name()))
			if err != nil {
				log.Printf("Failed to parse template %s: %v", file.Name(), err)
				continue
			}
			s.templates[slug] = tmpl
		}
	}

	log.Printf("Loaded %d email templates", len(s.templates))
}

func (s *EmailService) startWorkers() {
	for i := 0; i < s.workerCount; i++ {
		s.wg.Add(1)
		go s.worker(i)
	}
}

func (s *EmailService) worker(id int) {
	defer s.wg.Done()

	log.Printf("Email worker %d started", id)

	for {
		select {
		case email, ok := <-s.emailQueue:
			if !ok {
				log.Printf("Email worker %d stopping: queue closed", id)
				return
			}
			if err := s.sendEmail(email); err != nil {
				log.Printf("Failed to send email: %v", err)
			}
		case <-s.ctx.Done():
			log.Printf("Email worker %d stopping: context cancelled", id)
			return
		}
	}
}

func (s *EmailService) sendEmail(data EmailData) error {
	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPass, s.smtpHost)
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	headers := map[string]string{
		"From":         s.senderEmail,
		"To":           data.To,
		"Subject":      data.Subject,
		"MIME-version": "1.0",
		"Content-Type": "text/html; charset=\"UTF-8\"",
	}

	var message bytes.Buffer
	for k, v := range headers {
		message.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	message.WriteString("\r\n")
	message.WriteString(data.Body)

	to := []string{data.To}
	return smtp.SendMail(addr, auth, s.senderEmail, to, message.Bytes())
}

func (s *EmailService) Stop() {
	s.cancel()
	close(s.emailQueue)
	s.wg.Wait()
}

func (s *EmailService) QueueEmail(data EmailData) error {
	select {
	case s.emailQueue <- data:
		return nil
	default:
		return errors.New("email queue is full")
	}
}

func (s *EmailService) handleSendEmail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query()

	// Get required parameters
	to := query.Get("to")
	if to == "" {
		http.Error(w, "Missing 'to' parameter", http.StatusBadRequest)
		return
	}

	slug := query.Get("slug")
	if slug == "" {
		http.Error(w, "Missing 'slug' parameter", http.StatusBadRequest)
		return
	}

	// Get optional subject parameter
	subject := query.Get("subject")
	if subject == "" {
		subject = fmt.Sprintf("Email for %s", slug) // Default subject
	}

	// Find the template
	tmpl, ok := s.templates[slug]
	if !ok {
		http.Error(w, "Template not found", http.StatusNotFound)
		return
	}

	// Initialize template data
	data := make(map[string]interface{})

	// Check if we have a JSON data block
	jsonData := query.Get("data")
	if jsonData != "" {
		// Parse the JSON data
		var parsedData map[string]interface{}
		if err := json.Unmarshal([]byte(jsonData), &parsedData); err != nil {
			http.Error(w, "Invalid JSON in 'data' parameter", http.StatusBadRequest)
			return
		}

		// Add all JSON fields to our template data
		for key, value := range parsedData {
			data[key] = value
		}
	}

	// For backward compatibility: handle individual parameters
	// that might still be passed separately
	userId := query.Get("userId")
	if userId != "" {
		data["UserId"] = userId
	}

	name := query.Get("name")
	if name != "" {
		data["Name"] = name
	}

	var otp string
	if query.Get("generateOTP") == "true" {
		otp = generateOTP()
		data["OTP"] = otp
	} else {
		otp = query.Get("otp")
		if otp != "" {
			data["OTP"] = otp
		}
	}

	// Build metadata from any other query parameters
	// and add them to the data map
	metadata := make(map[string]string)
	for key, values := range query {
		if key != "to" && key != "slug" && key != "subject" && key != "data" &&
			key != "userId" && key != "name" && key != "otp" && key != "generateOTP" {
			metadata[key] = values[0]
			// Also add direct access to these query params
			data[key] = values[0]
		}
	}

	// Keep metadata for backward compatibility
	data["Metadata"] = metadata

	// Execute template to get the email body
	var bodyBuf bytes.Buffer
	if err := tmpl.Execute(&bodyBuf, data); err != nil {
		http.Error(w, fmt.Sprintf("Failed to render template: %v", err), http.StatusInternalServerError)
		return
	}

	// Queue the email for sending
	emailData := EmailData{
		To:       to,
		Subject:  subject,
		Body:     bodyBuf.String(),
		UserId:   userId,
		Name:     name,
		OTP:      otp,
		Metadata: metadata,
		Data:     data,
	}

	if err := s.QueueEmail(emailData); err != nil {
		http.Error(w, "Failed to queue email", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	fmt.Fprintf(w, `{"status":"success","message":"Email queued for delivery"}`)
}
func generateOTP() string {
	const digits = "0123456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = digits[rand.Intn(len(digits))]
	}
	return string(b)
}

func main() {
	fmt.Println("Initialising the email service")
	envcheck.Init()
	templatesDir := "./templates" // Update this path as needed
	service := NewEmailService(templatesDir)
	defer service.Stop()

	http.HandleFunc("/send", service.handleSendEmail)

	port := os.Getenv("EMAIL_SERVICE_PORT")
	if port == "" {
		port = "7979"
	}

	fmt.Printf("Starting server on port %s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
