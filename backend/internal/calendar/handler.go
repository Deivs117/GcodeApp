package calendar

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"gcode-flux-processor/backend/internal/database"
)

// oauth2Config returns the Google OAuth2 config from environment variables.
func oauth2Config() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes: []string{
			"https://www.googleapis.com/auth/calendar",
			"https://www.googleapis.com/auth/userinfo.email",
		},
		Endpoint: google.Endpoint,
	}
}

// Meeting represents a calendar event stored in the DB.
type Meeting struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	StartTime     time.Time `json:"startTime"`
	EndTime       time.Time `json:"endTime"`
	Attendees     []string  `json:"attendees"`
	GoogleEventID string    `json:"googleEventId,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

// CreateMeetingRequest is the JSON body for creating a meeting.
type CreateMeetingRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	StartTime   string   `json:"startTime"` // RFC3339
	EndTime     string   `json:"endTime"`   // RFC3339
	Attendees   []string `json:"attendees"`
}

// --- Handlers ----------------------------------------------------------

// HandleGetAuthURL returns the Google OAuth2 authorization URL.
func HandleGetAuthURL(c *fiber.Ctx) error {
	cfg := oauth2Config()
	if cfg.ClientID == "" {
		return c.Status(503).JSON(fiber.Map{
			"error": "Google OAuth2 not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL",
		})
	}
	url := cfg.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	return c.JSON(fiber.Map{"url": url})
}

// HandleOAuthCallback handles the OAuth2 callback from Google.
func HandleOAuthCallback(c *fiber.Ctx) error {
	cfg := oauth2Config()
	code := c.Query("code")
	if code == "" {
		return c.Status(400).JSON(fiber.Map{"error": "missing code parameter"})
	}
	token, err := cfg.Exchange(context.Background(), code)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "token exchange failed: " + err.Error()})
	}
	tokenJSON, err := json.Marshal(token)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to encode token"})
	}
	// In production, store the token securely (e.g., encrypted in DB or session).
	// For this implementation, we return it to the client.
	return c.JSON(fiber.Map{
		"token":   string(tokenJSON),
		"message": "Authentication successful",
	})
}

// HandleListMeetings returns all meetings from the database.
func HandleListMeetings(c *fiber.Ctx) error {
	rows, err := database.Pool.Query(context.Background(), `
		SELECT id, title, COALESCE(description,''), start_time, end_time,
		       COALESCE(attendees, '{}'), COALESCE(google_event_id,''), created_at
		FROM meetings
		ORDER BY start_time ASC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "query failed: " + err.Error()})
	}
	defer rows.Close()

	meetings := []Meeting{}
	for rows.Next() {
		var m Meeting
		if err := rows.Scan(
			&m.ID, &m.Title, &m.Description,
			&m.StartTime, &m.EndTime, &m.Attendees,
			&m.GoogleEventID, &m.CreatedAt,
		); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "scan failed: " + err.Error()})
		}
		meetings = append(meetings, m)
	}
	return c.JSON(meetings)
}

// HandleCreateMeeting creates a new meeting in the database.
func HandleCreateMeeting(c *fiber.Ctx) error {
	var req CreateMeetingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Title == "" {
		return c.Status(400).JSON(fiber.Map{"error": "title is required"})
	}

	start, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid startTime (use RFC3339)"})
	}
	end, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid endTime (use RFC3339)"})
	}
	if !end.After(start) {
		return c.Status(400).JSON(fiber.Map{"error": "endTime must be after startTime"})
	}

	var id string
	err = database.Pool.QueryRow(context.Background(), `
		INSERT INTO meetings (title, description, start_time, end_time, attendees)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, req.Title, req.Description, start, end, req.Attendees).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "insert failed: " + err.Error()})
	}

	// Optionally sync to Google Calendar if a token is provided in the Authorization header.
	googleEventID := ""
	if tokenHeader := c.Get("X-Google-Token"); tokenHeader != "" {
		googleEventID, _ = syncToGoogleCalendar(tokenHeader, req)
		if googleEventID != "" {
			_, _ = database.Pool.Exec(context.Background(),
				"UPDATE meetings SET google_event_id=$1 WHERE id=$2", googleEventID, id)
		}
	}

	return c.Status(201).JSON(fiber.Map{
		"id":            id,
		"googleEventId": googleEventID,
		"message":       "Meeting created",
	})
}

// HandleDeleteMeeting deletes a meeting by ID.
func HandleDeleteMeeting(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "id is required"})
	}

	tag, err := database.Pool.Exec(context.Background(),
		"DELETE FROM meetings WHERE id=$1", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "delete failed: " + err.Error()})
	}
	if tag.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "meeting not found"})
	}
	return c.JSON(fiber.Map{"message": "Meeting deleted"})
}

// HandleGetMeeting returns a single meeting by ID.
func HandleGetMeeting(c *fiber.Ctx) error {
	id := c.Params("id")
	var m Meeting
	err := database.Pool.QueryRow(context.Background(), `
		SELECT id, title, COALESCE(description,''), start_time, end_time,
		       COALESCE(attendees, '{}'), COALESCE(google_event_id,''), created_at
		FROM meetings WHERE id=$1
	`, id).Scan(
		&m.ID, &m.Title, &m.Description,
		&m.StartTime, &m.EndTime, &m.Attendees,
		&m.GoogleEventID, &m.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{"error": "meeting not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "query failed: " + err.Error()})
	}
	return c.JSON(m)
}

// syncToGoogleCalendar creates an event in Google Calendar using the stored OAuth2 token.
func syncToGoogleCalendar(tokenJSON string, req CreateMeetingRequest) (string, error) {
	var token oauth2.Token
	if err := json.Unmarshal([]byte(tokenJSON), &token); err != nil {
		return "", err
	}

	cfg := oauth2Config()
	client := cfg.Client(context.Background(), &token)

	start, _ := time.Parse(time.RFC3339, req.StartTime)
	end, _ := time.Parse(time.RFC3339, req.EndTime)

	type calendarTime struct {
		DateTime string `json:"dateTime"`
		TimeZone string `json:"timeZone"`
	}
	type attendee struct {
		Email string `json:"email"`
	}
	type calEvent struct {
		Summary     string       `json:"summary"`
		Description string       `json:"description"`
		Start       calendarTime `json:"start"`
		End         calendarTime `json:"end"`
		Attendees   []attendee   `json:"attendees"`
	}
	type calEventResp struct {
		ID string `json:"id"`
	}

	evt := calEvent{
		Summary:     req.Title,
		Description: req.Description,
		Start:       calendarTime{DateTime: start.Format(time.RFC3339), TimeZone: "UTC"},
		End:         calendarTime{DateTime: end.Format(time.RFC3339), TimeZone: "UTC"},
	}
	for _, email := range req.Attendees {
		evt.Attendees = append(evt.Attendees, attendee{Email: email})
	}

	body, err := json.Marshal(evt)
	if err != nil {
		return "", err
	}

	resp, err := client.Post(
		"https://www.googleapis.com/calendar/v3/calendars/primary/events",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var evtResp calEventResp
	if err := json.NewDecoder(resp.Body).Decode(&evtResp); err != nil {
		return "", err
	}
	return evtResp.ID, nil
}
