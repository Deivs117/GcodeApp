package main

import (
	"encoding/json"
	"log"
	"sort"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"

	"gcode-flux-processor/backend/internal/merger"
	"gcode-flux-processor/backend/pkg/models"
)

func main() {
	app := fiber.New(fiber.Config{
		BodyLimit: 50 * 1024 * 1024, // 50MB
	})

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "Content-Type",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	app.Post("/api/process", func(c *fiber.Ctx) error {
		form, err := c.MultipartForm()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid form"})
		}

		filterM0M6 := false
		if vals, ok := form.Value["filter_m0m6"]; ok && len(vals) > 0 {
			filterM0M6 = vals[0] == "true"
		}

		// Parse order array
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

		// Sort by order if provided
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

	log.Fatal(app.Listen(":8080"))
}
