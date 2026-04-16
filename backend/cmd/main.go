package main

import (
	"encoding/json"
	"log"
	"os"
	"sort"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"

	"gcode-flux-processor/backend/internal/calendar"
	"gcode-flux-processor/backend/internal/database"
	"gcode-flux-processor/backend/internal/merger"
	"gcode-flux-processor/backend/internal/reports"
	"gcode-flux-processor/backend/pkg/models"
)

func main() {
	// Connect to PostgreSQL (non-fatal: G-Code tool works without DB)
	if err := database.Connect(); err != nil {
		log.Printf("⚠️  Database not available: %v — Scheduler and CNC Reports will be disabled", err)
	} else {
		if err := database.Migrate(); err != nil {
			log.Printf("⚠️  Migration failed: %v", err)
		} else {
			log.Println("✅ Database connected and migrated")
		}
	}

	app := fiber.New(fiber.Config{
		BodyLimit: 50 * 1024 * 1024, // 50MB
	})

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: getAllowedOrigins(),
		AllowMethods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders: "Content-Type,X-Google-Token",
	}))

	// ── Health ──────────────────────────────────────────────────────────
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// ── G-Code processing ───────────────────────────────────────────────
	app.Post("/api/process", func(c *fiber.Ctx) error {
		form, err := c.MultipartForm()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid form"})
		}

		filterM0M6 := false
		if vals, ok := form.Value["filter_m0m6"]; ok && len(vals) > 0 {
			filterM0M6 = vals[0] == "true"
		}

		orderMap := map[string]int{}
		if vals, ok := form.Value["order"]; ok && len(vals) > 0 {
			var order []string
			if err := json.Unmarshal([]byte(vals[0]), &order); err == nil {
				for i, name := range order {
					orderMap[name] = i
				}
			}
		}

		files := form.File["files[]"]
		if len(files) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "no files uploaded"})
		}

		if len(orderMap) > 0 {
			sort.Slice(files, func(i, j int) bool {
				oi, okI := orderMap[files[i].Filename]
				oj, okJ := orderMap[files[j].Filename]
				if okI && okJ {
					return oi < oj
				}
				return okI
			})
		}

		gcodeFiles := make([]models.GcodeFile, 0, len(files))
		for _, fh := range files {
			f, err := fh.Open()
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "failed to open file: " + fh.Filename})
			}
			content := make([]byte, fh.Size)
			if _, err := f.Read(content); err != nil {
				f.Close()
				return c.Status(500).JSON(fiber.Map{"error": "failed to read file: " + fh.Filename})
			}
			f.Close()
			gcodeFiles = append(gcodeFiles, models.GcodeFile{
				Name:    fh.Filename,
				Content: content,
			})
		}

		req := models.ProcessRequest{
			Files:      gcodeFiles,
			FilterM0M6: filterM0M6,
		}
		result := merger.Merge(req)
		return c.JSON(result)
	})

	// ── Scheduler (Google Calendar + meetings) ──────────────────────────
	sched := app.Group("/api/scheduler")
	sched.Get("/auth-url", calendar.HandleGetAuthURL)
	sched.Get("/oauth-callback", calendar.HandleOAuthCallback)
	sched.Get("/meetings", withDB(calendar.HandleListMeetings))
	sched.Post("/meetings", withDB(calendar.HandleCreateMeeting))
	sched.Get("/meetings/:id", withDB(calendar.HandleGetMeeting))
	sched.Delete("/meetings/:id", withDB(calendar.HandleDeleteMeeting))

	// ── CNC Reports ─────────────────────────────────────────────────────
	cnc := app.Group("/api/cnc")
	cnc.Get("/clients", withDB(reports.HandleListClients))
	cnc.Post("/clients", withDB(reports.HandleCreateClient))
	cnc.Get("/pcb-versions", withDB(reports.HandleListPcbVersions))
	cnc.Post("/pcb-versions", withDB(reports.HandleCreatePcbVersion))
	cnc.Get("/sessions", withDB(reports.HandleListSessions))
	cnc.Post("/sessions", withDB(reports.HandleCreateSession))
	cnc.Put("/sessions/:id", withDB(reports.HandleUpdateSession))
	cnc.Delete("/sessions/:id", withDB(reports.HandleDeleteSession))
	cnc.Get("/sessions/:id/pdf", withDB(reports.HandleGeneratePDF))

	log.Fatal(app.Listen(":8080"))
}

// withDB is a middleware that rejects requests when the DB is not available.
func withDB(handler fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if database.Pool == nil {
			return c.Status(503).JSON(fiber.Map{
				"error": "Database not available. Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables.",
			})
		}
		return handler(c)
	}
}

func getAllowedOrigins() string {
	if origin := os.Getenv("ALLOWED_ORIGINS"); origin != "" {
		return origin
	}
	return "*"
}

