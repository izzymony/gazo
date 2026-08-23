package email_service

import "net/smtp"

type Email interface {
	Send(distination, message string) error
}


func sendMail(from, password, to, subject, body, smtpHost, smtpPort string) error {
	// Set up the authentication information.
	auth := smtp.PlainAuth("", from, password, smtpHost)

	// Create the email message.
	message := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"\r\n" +
		body + "\r\n")

	// Send the email.
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{to}, message)
	if err != nil {
		return err
	}

	return nil
}
