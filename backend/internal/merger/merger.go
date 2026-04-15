package merger

import (
	"strings"

	"gcode-flux-processor/backend/internal/filter"
	"gcode-flux-processor/backend/internal/parser"
	"gcode-flux-processor/backend/pkg/models"
)

func Merge(req models.ProcessRequest) models.ProcessResult {
	var sb strings.Builder
	totalLines := 0
	filteredLines := 0

	for i, f := range req.Files {
		lines := parser.ParseLines(f.Content)
		if i > 0 {
			sb.WriteString("\n; --- Fin de segmento ---\n\n")
		}
		for _, line := range lines {
			totalLines++
			keep, wasFiltered := filter.FilterLine(line, req.FilterM0M6)
			if wasFiltered {
				filteredLines++
			}
			if keep {
				sb.WriteString(line + "\n")
			}
		}
	}

	return models.ProcessResult{
		Output:        sb.String(),
		TotalLines:    totalLines,
		FilteredLines: filteredLines,
		FileName:      "resultado_unido.nc",
	}
}
