package reports

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jung-kurt/gofpdf"

	"gcode-flux-processor/backend/internal/database"
)

// MachiningSession represents a CNC machining work session.
type MachiningSession struct {
	ID            string     `json:"id"`
	ClientID      *string    `json:"clientId"`
	ClientName    *string    `json:"clientName,omitempty"`
	PcbVersionID  *string    `json:"pcbVersionId"`
	PcbVersion    *string    `json:"pcbVersion,omitempty"`
	Units         int        `json:"units"`
	Status        string     `json:"status"`
	TracksTimeSec int        `json:"tracksTimeSec"`
	DrillsTimeSec int        `json:"drillsTimeSec"`
	CutoutTimeSec int        `json:"cutoutTimeSec"`
	FailureNotes  string     `json:"failureNotes"`
	StartedAt     *time.Time `json:"startedAt"`
	FinishedAt    *time.Time `json:"finishedAt"`
	CreatedAt     time.Time  `json:"createdAt"`
}

// CreateSessionRequest is the JSON body for creating a machining session.
type CreateSessionRequest struct {
	ClientID      string `json:"clientId"`
	PcbVersionID  string `json:"pcbVersionId"`
	Units         int    `json:"units"`
	TracksTimeSec int    `json:"tracksTimeSec"`
	DrillsTimeSec int    `json:"drillsTimeSec"`
	CutoutTimeSec int    `json:"cutoutTimeSec"`
	FailureNotes  string `json:"failureNotes"`
	Status        string `json:"status"`
}

// UpdateSessionRequest is the JSON body for updating a machining session.
type UpdateSessionRequest struct {
	Status        string `json:"status"`
	TracksTimeSec int    `json:"tracksTimeSec"`
	DrillsTimeSec int    `json:"drillsTimeSec"`
	CutoutTimeSec int    `json:"cutoutTimeSec"`
	FailureNotes  string `json:"failureNotes"`
	Units         int    `json:"units"`
}

// Client represents a Flux client.
type Client struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

// PcbVersion represents a PCB design version.
type PcbVersion struct {
	ID        string    `json:"id"`
	Version   string    `json:"version"`
	ClientID  string    `json:"clientId"`
	CreatedAt time.Time `json:"createdAt"`
}

// --- Client handlers ---------------------------------------------------

func HandleListClients(c *fiber.Ctx) error {
	rows, err := database.Pool.Query(context.Background(),
		"SELECT id, name, COALESCE(email,''), created_at FROM clients ORDER BY name ASC")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	clients := []Client{}
	for rows.Next() {
		var cl Client
		if err := rows.Scan(&cl.ID, &cl.Name, &cl.Email, &cl.CreatedAt); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		clients = append(clients, cl)
	}
	return c.JSON(clients)
}

func HandleCreateClient(c *fiber.Ctx) error {
	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name is required"})
	}
	var id string
	err := database.Pool.QueryRow(context.Background(),
		"INSERT INTO clients (name, email) VALUES ($1,$2) RETURNING id",
		req.Name, req.Email).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"id": id})
}

// --- PCB version handlers ----------------------------------------------

func HandleListPcbVersions(c *fiber.Ctx) error {
	clientID := c.Query("clientId")
	var rows pgx.Rows
	var err error
	if clientID != "" {
		rows, err = database.Pool.Query(context.Background(),
			"SELECT id, version, client_id, created_at FROM pcb_versions WHERE client_id=$1 ORDER BY version ASC",
			clientID)
	} else {
		rows, err = database.Pool.Query(context.Background(),
			"SELECT id, version, client_id, created_at FROM pcb_versions ORDER BY version ASC")
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	versions := []PcbVersion{}
	for rows.Next() {
		var v PcbVersion
		if err := rows.Scan(&v.ID, &v.Version, &v.ClientID, &v.CreatedAt); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		versions = append(versions, v)
	}
	return c.JSON(versions)
}

func HandleCreatePcbVersion(c *fiber.Ctx) error {
	var req struct {
		Version  string `json:"version"`
		ClientID string `json:"clientId"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.Version == "" || req.ClientID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "version and clientId are required"})
	}
	var id string
	err := database.Pool.QueryRow(context.Background(),
		"INSERT INTO pcb_versions (version, client_id) VALUES ($1,$2) RETURNING id",
		req.Version, req.ClientID).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"id": id})
}

// --- Session handlers --------------------------------------------------

func HandleListSessions(c *fiber.Ctx) error {
	rows, err := database.Pool.Query(context.Background(), `
		SELECT ms.id, ms.client_id, c.name, ms.pcb_version_id, pv.version,
		       ms.units, ms.status, ms.tracks_time_sec, ms.drills_time_sec, ms.cutout_time_sec,
		       COALESCE(ms.failure_notes,''), ms.started_at, ms.finished_at, ms.created_at
		FROM machining_sessions ms
		LEFT JOIN clients c ON c.id = ms.client_id
		LEFT JOIN pcb_versions pv ON pv.id = ms.pcb_version_id
		ORDER BY ms.created_at DESC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	sessions := []MachiningSession{}
	for rows.Next() {
		var s MachiningSession
		if err := rows.Scan(
			&s.ID, &s.ClientID, &s.ClientName, &s.PcbVersionID, &s.PcbVersion,
			&s.Units, &s.Status, &s.TracksTimeSec, &s.DrillsTimeSec, &s.CutoutTimeSec,
			&s.FailureNotes, &s.StartedAt, &s.FinishedAt, &s.CreatedAt,
		); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		sessions = append(sessions, s)
	}
	return c.JSON(sessions)
}

func HandleCreateSession(c *fiber.Ctx) error {
	var req CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}

	status := req.Status
	if status == "" {
		status = "pending"
	}

	var clientID, pcbVersionID *string
	if req.ClientID != "" {
		clientID = &req.ClientID
	}
	if req.PcbVersionID != "" {
		pcbVersionID = &req.PcbVersionID
	}

	now := time.Now()
	var startedAt *time.Time
	if status == "running" {
		startedAt = &now
	}

	var id string
	err := database.Pool.QueryRow(context.Background(), `
		INSERT INTO machining_sessions
		  (client_id, pcb_version_id, units, status, tracks_time_sec, drills_time_sec, cutout_time_sec, failure_notes, started_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id
	`, clientID, pcbVersionID, req.Units, status,
		req.TracksTimeSec, req.DrillsTimeSec, req.CutoutTimeSec, req.FailureNotes, startedAt,
	).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"id": id})
}

func HandleUpdateSession(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}

	var finishedAt *time.Time
	if req.Status == "done" || req.Status == "failed" {
		now := time.Now()
		finishedAt = &now
	}

	tag, err := database.Pool.Exec(context.Background(), `
		UPDATE machining_sessions
		SET status=$1, tracks_time_sec=$2, drills_time_sec=$3, cutout_time_sec=$4,
		    failure_notes=$5, units=$6, finished_at=COALESCE(finished_at, $7)
		WHERE id=$8
	`, req.Status, req.TracksTimeSec, req.DrillsTimeSec, req.CutoutTimeSec,
		req.FailureNotes, req.Units, finishedAt, id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if tag.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	return c.JSON(fiber.Map{"message": "Session updated"})
}

func HandleDeleteSession(c *fiber.Ctx) error {
	id := c.Params("id")
	tag, err := database.Pool.Exec(context.Background(),
		"DELETE FROM machining_sessions WHERE id=$1", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if tag.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	return c.JSON(fiber.Map{"message": "Session deleted"})
}

// HandleGeneratePDF generates a PDF report for a machining session.
func HandleGeneratePDF(c *fiber.Ctx) error {
	id := c.Params("id")

	var s MachiningSession
	err := database.Pool.QueryRow(context.Background(), `
		SELECT ms.id, ms.client_id, c.name, ms.pcb_version_id, pv.version,
		       ms.units, ms.status, ms.tracks_time_sec, ms.drills_time_sec, ms.cutout_time_sec,
		       COALESCE(ms.failure_notes,''), ms.started_at, ms.finished_at, ms.created_at
		FROM machining_sessions ms
		LEFT JOIN clients c ON c.id = ms.client_id
		LEFT JOIN pcb_versions pv ON pv.id = ms.pcb_version_id
		WHERE ms.id=$1
	`, id).Scan(
		&s.ID, &s.ClientID, &s.ClientName, &s.PcbVersionID, &s.PcbVersion,
		&s.Units, &s.Status, &s.TracksTimeSec, &s.DrillsTimeSec, &s.CutoutTimeSec,
		&s.FailureNotes, &s.StartedAt, &s.FinishedAt, &s.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	pdfBytes, fileName, err := generatePDF(s)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "PDF generation failed: " + err.Error()})
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	return c.Send(pdfBytes)
}

// generatePDF creates a professional PDF report for the given session.
func generatePDF(s MachiningSession) ([]byte, string, error) {
	clientName := "Unknown"
	if s.ClientName != nil {
		clientName = *s.ClientName
	}
	version := "v0"
	if s.PcbVersion != nil {
		version = *s.PcbVersion
	}

	date := s.CreatedAt.Format("20060102")
	fileName := fmt.Sprintf("%s_%s_%s.pdf", date, sanitize(clientName), sanitize(version))

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// ── Header ───────────────────────────────────────────────────────────
	pdf.SetFillColor(15, 23, 42)   // slate-900
	pdf.SetTextColor(255, 255, 255) // white
	pdf.SetFont("Arial", "B", 20)
	pdf.CellFormat(0, 16, "Flux Engineering Hub", "0", 1, "C", true, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(0, 8, "CNC Machining Report", "0", 1, "C", true, 0, "")
	pdf.Ln(6)

	// ── Session info ─────────────────────────────────────────────────────
	pdf.SetTextColor(0, 0, 0)
	sectionHeader(pdf, "Session Information")
	infoRow(pdf, "Session ID", s.ID)
	infoRow(pdf, "Date", s.CreatedAt.Format("2006-01-02 15:04 UTC"))
	infoRow(pdf, "Client", clientName)
	infoRow(pdf, "PCB Version", version)
	infoRow(pdf, "Units", fmt.Sprintf("%d", s.Units))
	infoRow(pdf, "Status", statusLabel(s.Status))
	pdf.Ln(4)

	// ── Time breakdown ───────────────────────────────────────────────────
	sectionHeader(pdf, "Time Breakdown")
	total := s.TracksTimeSec + s.DrillsTimeSec + s.CutoutTimeSec
	infoRow(pdf, "Tracks Time", fmtSec(s.TracksTimeSec))
	infoRow(pdf, "Drills Time", fmtSec(s.DrillsTimeSec))
	infoRow(pdf, "Cutout Time", fmtSec(s.CutoutTimeSec))
	infoRow(pdf, "Total Machining Time", fmtSec(total))
	pdf.Ln(4)

	// ── Dates ─────────────────────────────────────────────────────────────
	sectionHeader(pdf, "Timeline")
	if s.StartedAt != nil {
		infoRow(pdf, "Started At", s.StartedAt.Format("2006-01-02 15:04 UTC"))
	}
	if s.FinishedAt != nil {
		infoRow(pdf, "Finished At", s.FinishedAt.Format("2006-01-02 15:04 UTC"))
	}
	pdf.Ln(4)

	// ── Failure notes (if any) ────────────────────────────────────────────
	if s.FailureNotes != "" {
		sectionHeader(pdf, "Failure Notes / Observations")
		pdf.SetFont("Arial", "", 10)
		pdf.MultiCell(0, 6, s.FailureNotes, "1", "L", false)
		pdf.Ln(4)
	}

	// ── Footer ────────────────────────────────────────────────────────────
	pdf.SetY(-20)
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(120, 120, 120)
	pdf.CellFormat(0, 6,
		fmt.Sprintf("Generated by Flux Engineering Hub on %s", time.Now().Format("2006-01-02 15:04 UTC")),
		"0", 0, "C", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, "", err
	}
	return buf.Bytes(), fileName, nil
}

func sectionHeader(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetFillColor(226, 232, 240) // slate-200
	pdf.SetTextColor(15, 23, 42)    // slate-900
	pdf.CellFormat(0, 8, "  "+title, "0", 1, "L", true, 0, "")
	pdf.Ln(2)
}

func infoRow(pdf *gofpdf.Fpdf, label, value string) {
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(71, 85, 105) // slate-500
	pdf.CellFormat(55, 7, label+":", "0", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(15, 23, 42) // slate-900
	pdf.CellFormat(0, 7, value, "0", 1, "L", false, 0, "")
}

func fmtSec(sec int) string {
	h := sec / 3600
	m := (sec % 3600) / 60
	s := sec % 60
	return fmt.Sprintf("%02dh %02dm %02ds", h, m, s)
}

func statusLabel(s string) string {
	switch s {
	case "pending":
		return "Por empezar"
	case "running":
		return "Maquinando"
	case "failed":
		return "Fallo"
	case "done":
		return "Finalizado"
	default:
		return s
	}
}

func sanitize(s string) string {
	result := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') {
			result = append(result, c)
		} else {
			result = append(result, '_')
		}
	}
	return string(result)
}
