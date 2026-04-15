package merger

import (
	"strings"
	"testing"

	"gcode-flux-processor/backend/pkg/models"
)

func TestMerge_Basic(t *testing.T) {
	req := models.ProcessRequest{
		Files: []models.GcodeFile{
			{Name: "a.nc", Content: []byte("G00 X0\nM03 S1000\n")},
			{Name: "b.nc", Content: []byte("G01 X10\n")},
		},
		FilterM0M6: false,
	}
	result := Merge(req)
	if result.TotalLines != 3 {
		t.Errorf("expected 3 total lines, got %d", result.TotalLines)
	}
	if result.FilteredLines != 0 {
		t.Errorf("expected 0 filtered, got %d", result.FilteredLines)
	}
}

func TestMerge_WithFilter(t *testing.T) {
	req := models.ProcessRequest{
		Files: []models.GcodeFile{
			{Name: "a.nc", Content: []byte("G00 X0\nM0\nM6 T1\nG01 X10\n")},
		},
		FilterM0M6: true,
	}
	result := Merge(req)
	if result.FilteredLines != 2 {
		t.Errorf("expected 2 filtered lines, got %d", result.FilteredLines)
	}
	if strings.Contains(result.Output, "M0\n") {
		t.Error("M0 should not appear in output")
	}
	if strings.Contains(result.Output, "M6 T1") {
		t.Error("M6 T1 should not appear in output")
	}
}
